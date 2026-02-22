import { tool } from 'ai';
import { z } from 'zod';
import type { Attachment } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';
import { getDefaultContent, validateLexicalContent } from '@/lib/lexical-config';

const ATTACHMENT_LIST_SELECT = 'id, name, description, organisation_id, created_at';

const DESCRIPTIONS = {
	tools: {
		getAttachmentsList:
			'Get all attachments (without content field — use getAttachment to retrieve the full content of a specific attachment)',
		getAttachment: 'Get a single attachment by Attachment ID',
		createAttachment: 'Create a new attachment.',
		updateAttachment: 'Update an existing attachment.',
		deleteAttachment: 'Delete an attachment',
	},
	fields: {
		id: '',
		name: '',
		description: '',
		content: '',
	},
};

export function createAttachmentsTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getAttachmentsList: tool({
			description: DESCRIPTIONS.tools.getAttachmentsList,
			inputSchema: z.object({}),
			execute: async () => {
				try {
					const { data, error } = await supabase
						.from('attachments')
						.select(ATTACHMENT_LIST_SELECT)
						.eq('organisation_id', organisationId)
						.order('created_at', { ascending: false });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						attachments: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getAttachment: tool({
			description: DESCRIPTIONS.tools.getAttachment,
			inputSchema: z.object({
				id: z.string().uuid('Attachment ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('attachments')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Attachment not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						attachment: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createAttachment: tool({
			description: DESCRIPTIONS.tools.createAttachment,
			inputSchema: z.object({
				name: z.string().min(1, 'Attachment name is required').describe(DESCRIPTIONS.fields.name),
				description: z
					.string()
					.min(1, 'Description is required')
					.describe(DESCRIPTIONS.fields.description),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
			}),
			execute: async ({ name, description, content }) => {
				try {
					// Validate and ensure content is in Lexical format
					let attachmentContent = getDefaultContent();
					if (content !== undefined && content !== null) {
						// Validate content first
						const validationResult = validateLexicalContent(content);
						if (!validationResult.valid) {
							return {
								success: false,
								error: 'The returned value does not have the correct lexical value.',
							};
						}
						// Use validated content directly
						attachmentContent = content;
					}

					const { data, error } = await supabase
						.from('attachments')
						.insert({
							name,
							description,
							content: attachmentContent,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'attachment', data.id);

					return {
						success: true,
						attachment: data as Attachment,
						message: 'Attachment created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateAttachment: tool({
			description: DESCRIPTIONS.tools.updateAttachment,
			inputSchema: z.object({
				id: z.string().uuid('Attachment ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().min(1).optional().describe(DESCRIPTIONS.fields.description),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<Attachment> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							// Validate content if it's the content field
							if (key === 'content') {
								// Validate content first
								const validationResult = validateLexicalContent(value);
								if (!validationResult.valid) {
									throw new Error('The returned value does not have the correct lexical value.');
								}
								// Use validated content directly
								cleanUpdates[key as keyof Attachment] = value as any;
							} else {
								cleanUpdates[key as keyof Attachment] = value as any;
							}
						}
					});

					const { data, error } = await supabase
						.from('attachments')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						attachment: data as Attachment,
						message: 'Attachment updated successfully',
					};
				} catch (error) {
					// Check if it's a validation error
					if (
						error instanceof Error &&
						error.message === 'The returned value does not have the correct lexical value.'
					) {
						return {
							success: false,
							error: 'The returned value does not have the correct lexical value.',
						};
					}
					return handleToolError(error);
				}
			},
		}),

		deleteAttachment: tool({
			description: DESCRIPTIONS.tools.deleteAttachment,
			inputSchema: z.object({
				id: z.string().uuid('Attachment ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('attachments').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Attachment deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
