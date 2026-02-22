'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { ChatMessage, ChatAttachment } from '@/lib/types';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { toolGroups, DEFAULT_ENABLED_TOOLS } from '@/lib/ai/tool-groups';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { Messages } from '@/components/messages';
import { MultimodalInput } from '@/components/multimodal-input';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiSelect } from '@/components/ui/multi-select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
	ProposalCanvas,
	type ProposalCanvasHandle,
} from '@/components/ai-assistant/proposal-canvas';
import { FileCode, PanelRightOpen } from 'lucide-react';

export function AIAssistantClient() {
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations('chat');
	const tNav = useTranslations('navigation');
	const tCommon = useTranslations('common');
	const [input, setInput] = useState('');
	const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
	const [usage, setUsage] = useState<
		| {
				totalTokens?: number;
				inputTokens?: number;
				outputTokens?: number;
				reasoningTokens?: number;
				cachedInputTokens?: number;
				context?: {
					totalMax?: number;
					combinedMax?: number;
					inputMax?: number;
				};
				costUSD?: {
					totalUSD?: number | string;
					inputUSD?: number | string;
					outputUSD?: number | string;
					reasoningUSD?: number | string;
					cacheReadUSD?: number | string;
				};
		  }
		| undefined
	>(undefined);
	const [selectedModelId, setSelectedModelId] = useLocalStorage('chat-model', DEFAULT_CHAT_MODEL);
	const [enabledTools, setEnabledTools] = useLocalStorage<string[]>(
		'ai-assistant-enabled-tools',
		DEFAULT_ENABLED_TOOLS
	);

	// Canvas ref for opening proposals
	const canvasRef = useRef<ProposalCanvasHandle>(null);
	const [canvasProposalId, setCanvasProposalId] = useState<string | null>(null);
	const [canvasIsOpen, setCanvasIsOpen] = useState(false);

	// Validation error state
	const [validationError, setValidationError] = useState<string | null>(null);

	// Use refs to ensure we always have the latest values in closures
	const enabledToolsRef = useRef(enabledTools);
	const selectedModelIdRef = useRef(selectedModelId);
	const canvasProposalIdRef = useRef(canvasProposalId);

	// Update refs when values change
	useEffect(() => {
		enabledToolsRef.current = enabledTools;
	}, [enabledTools]);

	useEffect(() => {
		selectedModelIdRef.current = selectedModelId;
	}, [selectedModelId]);

	useEffect(() => {
		canvasProposalIdRef.current = canvasProposalId;
	}, [canvasProposalId]);

	// Clear validation error when user manually changes input
	useEffect(() => {
		if (input && validationError) {
			setValidationError(null);
		}
	}, [input, validationError]);

	// Monitor canvas state for showing expand button
	useEffect(() => {
		const interval = setInterval(() => {
			if (canvasRef.current) {
				const proposalId = canvasRef.current.getProposalId();
				const isOpen = canvasRef.current.isOpen();
				setCanvasProposalId(proposalId);
				setCanvasIsOpen(isOpen);
			}
		}, 100);

		return () => clearInterval(interval);
	}, []);

	// Use useChat hook from AI SDK
	const { messages, setMessages, sendMessage, status, stop, regenerate } = useChat<ChatMessage>({
		id: 'ai-assistant',
		transport: new DefaultChatTransport({
			api: '/api/chat',
			prepareSendMessagesRequest(request) {
				// Use refs to ensure we always have the latest values
				const currentEnabledTools = enabledToolsRef.current;
				let currentModelId = selectedModelIdRef.current;
				const currentProposalId = canvasProposalIdRef.current;

				// Validate model ID - ensure it's a string and a valid model
				const validModels = [
					'claude-opus-4-1',
					'claude-opus-4',
					'claude-sonnet-4-5',
					'claude-sonnet-4',
					'claude-haiku-4-5',
				];
				if (
					!currentModelId ||
					typeof currentModelId !== 'string' ||
					!validModels.includes(currentModelId)
				) {
					console.warn('[AI Assistant Client] Invalid model ID, using default:', currentModelId);
					currentModelId = DEFAULT_CHAT_MODEL;
				}

				// Validate enabledTools - ensure it's an array
				const validEnabledTools = Array.isArray(currentEnabledTools) ? currentEnabledTools : [];

				return {
					body: {
						...request.body,
						id: request.id,
						messages: request.messages,
						// Override with current values to ensure they're up-to-date
						selectedChatModel: currentModelId,
						enabledTools: validEnabledTools,
						proposalId: currentProposalId || undefined,
					},
				};
			},
		}),
		onError: (error) => {
			console.error('Chat error:', error);
		},
		onData: (dataPart) => {
			if (dataPart.type === 'data-usage') {
				setUsage(dataPart.data as typeof usage);
			}
		},
	});

	const handleNewChat = () => {
		setMessages([]);
		setInput('');
		setAttachments([]);
		setUsage(undefined);
		router.refresh();
	};

	const handleExpandCanvas = () => {
		if (canvasRef.current && canvasProposalId) {
			canvasRef.current.openProposal(canvasProposalId);
		}
	};

	return (
		<DataStreamProvider>
			<div className="flex h-full flex-col">
				{/* Main content area - split 50/50 when canvas is open, 100% when closed */}
				<div className="flex flex-1 overflow-hidden">
					{/* Left side - AI Assistant */}
					<div className="flex flex-col flex-1 min-w-0">
						{/* Header - only over chat */}
						<div className="flex items-center justify-between border-b border-border px-4 py-2.5 gap-2">
							<h2 className="font-semibold text-lg">{t('aiAssistant')}</h2>
							<div className="flex items-center gap-2">
								<MultiSelect
									options={toolGroups.map((group) => ({
										id: group.id,
										label: group.label,
										description: group.description,
									}))}
									selected={enabledTools}
									onSelectionChange={setEnabledTools}
									placeholder={tCommon('selectTools')}
									triggerClassName="w-[140px]"
								/>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="ghost" size="icon" asChild>
												<Link href={`/${locale}/dashboard/ai-assistant/prompts`}>
													<FileCode className="h-4 w-4" />
												</Link>
											</Button>
										</TooltipTrigger>
										<TooltipContent>{tNav('promptTemplates')}</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button onClick={handleNewChat} size="icon" variant="ghost">
												<PlusIcon size={16} />
											</Button>
										</TooltipTrigger>
										<TooltipContent>{t('newChat')}</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								{canvasProposalId && !canvasIsOpen && (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button onClick={handleExpandCanvas} size="icon" variant="ghost">
													<PanelRightOpen className="h-5 w-5" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>{t('expandCanvas')}</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
							</div>
						</div>

						{/* Messages */}
						<div className="flex-1 overflow-hidden">
							<Messages
								status={status}
								messages={messages}
								setMessages={setMessages}
								regenerate={regenerate}
								isReadonly={false}
							/>
						</div>

						{/* Validation Error Banner */}
						{validationError && (
							<div className="border-t border-border p-4">
								<Alert variant="destructive">
									<AlertTitle>Validation Error</AlertTitle>
									<AlertDescription className="flex items-center justify-between gap-4">
										<span className="flex-1">
											The AI made changes that resulted in invalid content structure.
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setInput(`Fix the following validation error: ${validationError}`);
												setValidationError(null);
											}}
										>
											Resolve Conflict
										</Button>
									</AlertDescription>
								</Alert>
							</div>
						)}

						{/* Input */}
						<div className="border-t border-border p-4">
							<MultimodalInput
								input={input}
								setInput={setInput}
								status={status}
								stop={stop}
								attachments={attachments}
								setAttachments={setAttachments}
								sendMessage={sendMessage}
								setMessages={setMessages}
								selectedModelId={selectedModelId}
								onModelChange={setSelectedModelId}
								messages={messages}
								usage={usage}
							/>
						</div>
					</div>

					{/* Right side - Canvas */}
					<ProposalCanvas ref={canvasRef} messages={messages} onValidationError={setValidationError} />
				</div>
			</div>
		</DataStreamProvider>
	);
}
