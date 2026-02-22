import {
	createUIMessageStream,
	JsonToSseTransformStream,
	streamText,
	convertToModelMessages,
	stepCountIs,
} from 'ai';
import { z } from 'zod';
import { getUser, getUserOrganisation } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { systemPrompt, type RequestHints } from '@/lib/ai/prompts';
import { createAIProvider } from '@/lib/ai/providers';
import { createAllTools } from '@/lib/ai/tools';
import { getModelContextWindow } from '@/lib/ai/models';

export const maxDuration = 60;

// Request body schema
const textPartSchema = z.object({
	type: z.enum(['text']),
	text: z.string().min(1),
});

const filePartSchema = z.object({
	type: z.enum(['file']),
	url: z.string(),
	name: z.string().optional(),
	mediaType: z.string().optional(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const messageSchema = z
	.object({
		id: z.string(),
		role: z.enum(['user', 'assistant', 'tool']),
		parts: z.array(z.any()).optional(), // Accept any parts format, we'll normalize them
		content: z.string().optional(),
	})
	.refine(
		(data) => {
			// Message must have either parts or content
			return (data.parts && data.parts.length > 0) || data.content !== undefined;
		},
		{
			message: 'Message must have either parts or content',
		}
	);

const postRequestBodySchema = z.object({
	id: z.string().optional(),
	message: z
		.object({
			id: z.string(),
			role: z.enum(['user']),
			parts: z.array(partSchema),
		})
		.optional(),
	messages: z.array(messageSchema).optional(),
	enabledTools: z.array(z.string()).optional(),
	selectedChatModel: z
		.enum([
			'claude-opus-4-1',
			'claude-opus-4',
			'claude-sonnet-4-5',
			'claude-sonnet-4',
			'claude-haiku-4-5',
		])
		.default('claude-haiku-4-5'),
	proposalId: z.string().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

export async function POST(request: Request) {
	let requestBody: PostRequestBody;

	let json: any;
	try {
		json = await request.json();
		requestBody = postRequestBodySchema.parse(json);
	} catch (error) {
		console.error('Invalid request body:', error);
		return new Response(JSON.stringify({ error: 'Invalid request body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		// Check authentication
		const user = await getUser();
		if (!user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Get user's organisation to check AI settings
		const membership = await getUserOrganisation();
		if (!membership) {
			return new Response(JSON.stringify({ error: 'No organisation found' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const organisation = membership.organisations;

		// Check if AI features are enabled
		if (!organisation.ai_feature) {
			return new Response(
				JSON.stringify({ error: 'AI features are not enabled for this organisation' }),
				{ status: 403, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Check if API key is set
		if (!organisation.ai_api_key) {
			return new Response(
				JSON.stringify({
					error: 'Anthropic API key is not set. Please configure it in your organisation settings.',
					code: 'MISSING_API_KEY',
				}),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Create AI provider with organisation's API key
		const aiProvider = createAIProvider(organisation.ai_api_key);

		// Create Supabase client (uses cookies/session for RLS)
		const supabase = await createClient();

		const {
			id: _id,
			message,
			messages: allMessages,
			enabledTools,
			selectedChatModel,
			proposalId,
		} = requestBody;

		// Get request hints (optional geolocation and proposal context)
		const requestHints: RequestHints = {
			proposalId: proposalId || null,
			// Could extract from request headers if needed
		};

		// Convert messages to model messages format
		// Use all messages if available, otherwise use single message
		let modelMessages;
		if (allMessages && Array.isArray(allMessages) && allMessages.length > 0) {
			// Limit message history to reduce token usage
			// Keep last 20 messages (approximately 10 user-assistant pairs)
			// This prevents context from growing indefinitely and reduces costs
			const MAX_MESSAGES = 20;
			const limitedMessages =
				allMessages.length > MAX_MESSAGES ? allMessages.slice(-MAX_MESSAGES) : allMessages;

			// Normalize messages: convert content to parts format and filter invalid parts
			const normalizedMessages = limitedMessages
				.map((msg) => {
					// Handle tool messages - they need special treatment for sequential tool calls
					if (msg.role === 'tool') {
						const toolMsg = msg as any;

						// convertToModelMessages expects tool messages in one of these formats:
						// 1. { role: 'tool', toolCallId: string, content: string }
						// 2. { role: 'tool', content: Array<{ type: 'tool-result', toolCallId: string, result: any }> }

						// If tool message has parts with tool-result, convert to content array format
						if (toolMsg.parts && Array.isArray(toolMsg.parts)) {
							const toolResultParts = toolMsg.parts.filter(
								(part: any) => part.type === 'tool-result' || part.type?.startsWith('tool-')
							);

							if (toolResultParts.length > 0) {
								// Convert to content array format with tool-result objects
								return {
									role: 'tool' as const,
									content: toolResultParts.map((part: any) => ({
										type: 'tool-result' as const,
										toolCallId: part.toolCallId,
										toolName: part.toolName,
										result:
											part.result !== undefined ? part.result : part.output !== undefined ? part.output : part,
									})),
								};
							}
						}

						// If tool message has content directly (string or array), use it
						if (toolMsg.content !== undefined) {
							// If content is already an array, use it as-is
							if (Array.isArray(toolMsg.content)) {
								return {
									role: 'tool' as const,
									content: toolMsg.content,
								};
							}
							// If content is a string, use it directly
							return {
								role: 'tool' as const,
								content: toolMsg.content,
							};
						}

						// If tool message has toolCallId and result/content directly, use them
						if (toolMsg.toolCallId) {
							const content =
								toolMsg.result !== undefined
									? toolMsg.result
									: toolMsg.content !== undefined
										? toolMsg.content
										: '';

							return {
								role: 'tool' as const,
								toolCallId: toolMsg.toolCallId,
								content: content,
							};
						}

						// If we can't parse the tool message, return null to skip it
						// This prevents invalid tool messages from breaking the conversation
						return null;
					}

					// Handle assistant messages with content string
					if (msg.role === 'assistant' && msg.content && !msg.parts) {
						return {
							...msg,
							parts: [{ type: 'text' as const, text: msg.content }],
						};
					}

					// Handle messages with parts - filter and validate parts
					if (msg.parts && Array.isArray(msg.parts)) {
						const validParts = msg.parts
							.filter((part: any) => {
								// Only keep text parts with valid text
								if (part.type === 'text') {
									return typeof part.text === 'string' && part.text.length > 0;
								}
								// Keep file parts
								if (part.type === 'file') {
									return typeof part.url === 'string';
								}
								// Filter out other part types (reasoning, tool-call, etc.) as they're not needed for model messages
								return false;
							})
							.map((part: any) => {
								// Ensure text parts have the correct format
								if (part.type === 'text') {
									return { type: 'text' as const, text: String(part.text || '') };
								}
								// Ensure file parts have the correct format
								if (part.type === 'file') {
									return {
										type: 'file' as const,
										url: String(part.url || ''),
										name: part.name ? String(part.name) : undefined,
										mediaType:
											part.mediaType || part.contentType
												? String(part.mediaType || part.contentType)
												: undefined,
									};
								}
								return part;
							});

						// If no valid parts remain, skip user messages, but keep assistant messages (they might have content)
						if (validParts.length === 0 && msg.role === 'user') {
							return null;
						}

						// For assistant messages, if no valid parts, try to use content if available
						if (validParts.length === 0 && msg.role === 'assistant' && msg.content) {
							return {
								...msg,
								parts: [{ type: 'text' as const, text: String(msg.content) }],
							};
						}

						return {
							...msg,
							parts: validParts.length > 0 ? validParts : undefined,
						};
					}

					return msg;
				})
				.filter((msg): msg is NonNullable<typeof msg> => msg !== null);

			// Include all message types (user, assistant, tool) for convertToModelMessages
			// Tool messages are essential for sequential tool calls
			const filteredMessages = normalizedMessages.filter((msg) => {
				// Include tool messages - they are needed for sequential tool calls
				if (msg.role === 'tool') {
					return true;
				}

				// Include user and assistant messages
				if (msg.role === 'user' || msg.role === 'assistant') {
					// User messages must have parts
					if (msg.role === 'user' && (!msg.parts || msg.parts.length === 0)) {
						return false;
					}
					// Assistant messages can have parts or content
					return true;
				}

				// Filter out any other message types
				return false;
			});

			if (filteredMessages.length > 0) {
				modelMessages = convertToModelMessages(filteredMessages as any);
			} else {
				return new Response(JSON.stringify({ error: 'No valid messages provided' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		} else if (message) {
			modelMessages = convertToModelMessages([
				{
					role: 'user' as const,
					parts: message.parts as any,
				},
			]);
		} else {
			return new Response(JSON.stringify({ error: 'No message provided' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Create tools with enabled tool groups
		const tools = createAllTools({
			organisationId: organisation.id,
			userId: user.id,
			supabase: supabase,
			onFieldChange: (_field, _value) => {
				// This will be handled on the client side via tool results
				// Field changes are returned in tool results and processed by the client
			},
			enabledTools: enabledTools,
		});

		const stream = createUIMessageStream({
			execute: ({ writer: dataStream }) => {
				const result = streamText({
					model: aiProvider.languageModel(selectedChatModel),
					system: systemPrompt({
						requestHints,
						organisationSystemPrompt: organisation.ai_system_prompt,
					}),
					messages: modelMessages,
					tools,
					stopWhen: stepCountIs(10), // Reduced from 5 to limit tool call costs
					onFinish: async ({ usage }) => {
						if (usage) {
							// Get the context window size for the selected model
							const contextWindow = getModelContextWindow(selectedChatModel);

							// Include context window size in usage data for percentage calculation
							dataStream.write({
								type: 'data-usage',
								data: {
									...usage,
									context: {
										totalMax: contextWindow,
										combinedMax: contextWindow,
										inputMax: contextWindow,
									},
								},
							});
						}
					},
				});

				result.consumeStream();

				dataStream.merge(result.toUIMessageStream());
			},
			generateId: () => crypto.randomUUID(),
		});

		return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('Error in chat API:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal server error',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
