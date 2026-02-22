'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import { useTranslations } from 'next-intl';
import {
	type ChangeEvent,
	type Dispatch,
	memo,
	type SetStateAction,
	startTransition,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';
import type { ChatMessage, ChatAttachment } from '@/lib/types';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import {
	PromptInput,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputTools,
	PromptInputModelSelect,
	PromptInputModelSelectContent,
	PromptInputModelSelectTrigger,
} from './elements/prompt-input';
import { ArrowUpIcon, PaperclipIcon, CpuIcon } from './icons';
import { Pause } from 'lucide-react';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { SelectItem } from './ui/select';
import { SuggestedActions } from './suggested-actions';
import { Context } from './elements/context';
import { userPromptTemplatesService } from '@/lib/user-prompt-templates-service';
import type { UserPromptTemplate } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

function PureMultimodalInput({
	input,
	setInput,
	status,
	stop,
	attachments,
	setAttachments,
	sendMessage,
	setMessages,
	className,
	selectedModelId,
	onModelChange,
	messages,
	usage,
}: {
	input: string;
	setInput: Dispatch<SetStateAction<string>>;
	status: UseChatHelpers<ChatMessage>['status'];
	stop: () => void;
	attachments: ChatAttachment[];
	setAttachments: Dispatch<SetStateAction<ChatAttachment[]>>;
	sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
	setMessages: UseChatHelpers<ChatMessage>['setMessages'];
	className?: string;
	selectedModelId: string;
	onModelChange?: (modelId: string) => void;
	messages?: ChatMessage[];
	usage?: {
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
	};
}) {
	const t = useTranslations('common');
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadQueue, setUploadQueue] = useState<string[]>([]);
	const [promptTemplates, setPromptTemplates] = useState<UserPromptTemplate[]>([]);
	const [showAutocomplete, setShowAutocomplete] = useState(false);
	const [autocompleteQuery, setAutocompleteQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const autocompleteRef = useRef<HTMLDivElement>(null);
	const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
		null
	);

	const [localStorageInput, setLocalStorageInput] = useLocalStorage('input', '');

	useEffect(() => {
		if (textareaRef.current) {
			const domValue = textareaRef.current.value;
			const finalValue = domValue || localStorageInput || '';
			setInput(finalValue);
		}
	}, [localStorageInput, setInput]);

	useEffect(() => {
		setLocalStorageInput(input);
	}, [input, setLocalStorageInput]);

	// Load prompt templates on mount
	useEffect(() => {
		const loadTemplates = async () => {
			try {
				const supabase = createClient();
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (user) {
					const templates = await userPromptTemplatesService.getPromptTemplates(user.id);
					setPromptTemplates(templates);
				}
			} catch (error) {
				console.error('Failed to load prompt templates:', error);
			}
		};
		loadTemplates();
	}, []);

	const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = event.target.value;
		setInput(value);

		// Check for slash command
		const cursorPosition = event.target.selectionStart;
		const textBeforeCursor = value.substring(0, cursorPosition);
		const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

		if (lastSlashIndex !== -1) {
			// Check if there's a space or newline after the slash (if so, don't show autocomplete)
			const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
			if (!textAfterSlash.includes(' ') && !textAfterSlash.includes('\n')) {
				const query = textAfterSlash.toLowerCase();
				setAutocompleteQuery(query);
				setShowAutocomplete(true);
				setSelectedIndex(0);

				// Calculate dropdown position
				if (textareaRef.current) {
					const rect = textareaRef.current.getBoundingClientRect();
					setDropdownPosition({
						top: rect.top - 8, // 8px above the textarea
						left: rect.left + 16, // 16px from left (padding)
					});
				}
				return;
			}
		}

		setShowAutocomplete(false);
		setDropdownPosition(null);
	};

	const getFilteredTemplates = () => {
		if (!autocompleteQuery) {
			return promptTemplates;
		}
		return promptTemplates.filter((template) =>
			template.name.toLowerCase().includes(autocompleteQuery)
		);
	};

	const insertTemplate = (template: UserPromptTemplate) => {
		if (!textareaRef.current) return;

		const textarea = textareaRef.current;
		const cursorPosition = textarea.selectionStart;
		const textBeforeCursor = input.substring(0, cursorPosition);
		const textAfterCursor = input.substring(cursorPosition);
		const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

		if (lastSlashIndex !== -1) {
			const newText = input.substring(0, lastSlashIndex) + template.text + textAfterCursor;
			setInput(newText);
			setShowAutocomplete(false);

			// Set cursor position after inserted text
			setTimeout(() => {
				if (textareaRef.current) {
					const newCursorPosition = lastSlashIndex + template.text.length;
					textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
					textareaRef.current.focus();
				}
			}, 0);
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (showAutocomplete && getFilteredTemplates().length > 0) {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setSelectedIndex((prev) => (prev < getFilteredTemplates().length - 1 ? prev + 1 : prev));
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
			} else if (event.key === 'Enter' && !event.shiftKey) {
				const filtered = getFilteredTemplates();
				if (filtered[selectedIndex]) {
					event.preventDefault();
					insertTemplate(filtered[selectedIndex]);
				}
			} else if (event.key === 'Escape') {
				event.preventDefault();
				setShowAutocomplete(false);
			}
		}

		// Handle Enter key for submission (original behavior)
		if (event.key === 'Enter' && !event.shiftKey && !showAutocomplete) {
			event.preventDefault();
			const form = event.currentTarget.form;
			if (form && status === 'ready') {
				form.requestSubmit();
			}
		}
	};

	const submitForm = useCallback(() => {
		sendMessage({
			role: 'user',
			parts: [
				...attachments.map((attachment) => ({
					type: 'file' as const,
					url: attachment.url,
					name: attachment.name,
					mediaType: attachment.contentType || attachment.mediaType || 'application/octet-stream',
				})),
				{
					type: 'text',
					text: input,
				},
			],
		});

		setAttachments([]);
		setLocalStorageInput('');
		setInput('');

		textareaRef.current?.focus();
	}, [input, setInput, attachments, sendMessage, setAttachments, setLocalStorageInput]);

	const uploadFile = useCallback(async (file: File) => {
		const formData = new FormData();
		formData.append('file', file);

		try {
			const response = await fetch('/api/files/upload', {
				method: 'POST',
				body: formData,
			});

			if (response.ok) {
				const data = await response.json();
				const { url, pathname, contentType } = data;

				return {
					url,
					name: pathname,
					contentType,
				};
			}
			const { error } = await response.json();
			toast.error(error);
		} catch {
			toast.error(t('failedToUpload'));
		}
	}, []);

	const handleFileChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files || []);

			setUploadQueue(files.map((file) => file.name));

			try {
				const uploadPromises = files.map((file) => uploadFile(file));
				const uploadedAttachments = await Promise.all(uploadPromises);
				const successfullyUploadedAttachments = uploadedAttachments.filter(
					(attachment) => attachment !== undefined
				) as ChatAttachment[];

				setAttachments((currentAttachments) => [
					...currentAttachments,
					...successfullyUploadedAttachments,
				]);
			} catch (error) {
				console.error('Error uploading files!', error);
			} finally {
				setUploadQueue([]);
			}
		},
		[setAttachments, uploadFile]
	);

	return (
		<div className={cn('relative flex w-full flex-col gap-4 overflow-visible', className)}>
			{messages && messages.length === 0 && attachments.length === 0 && uploadQueue.length === 0 && (
				<SuggestedActions sendMessage={sendMessage} />
			)}

			<input
				className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
				multiple
				onChange={handleFileChange}
				ref={fileInputRef}
				tabIndex={-1}
				type="file"
			/>

			<PromptInput
				className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50 overflow-visible"
				onSubmit={(event) => {
					event.preventDefault();
					if (status !== 'ready') {
						toast.error(t('waitForModelResponse'));
					} else {
						submitForm();
					}
				}}
			>
				{(attachments.length > 0 || uploadQueue.length > 0) && (
					<div
						className="flex flex-row items-end gap-2 overflow-x-scroll"
						data-testid="attachments-preview"
					>
						{attachments.map((attachment) => (
							<PreviewAttachment
								attachment={attachment}
								key={attachment.url}
								onRemove={() => {
									setAttachments((currentAttachments) =>
										currentAttachments.filter((a) => a.url !== attachment.url)
									);
									if (fileInputRef.current) {
										fileInputRef.current.value = '';
									}
								}}
							/>
						))}

						{uploadQueue.map((filename) => (
							<PreviewAttachment
								attachment={{
									url: '',
									name: filename,
									contentType: '',
								}}
								isUploading={true}
								key={filename}
							/>
						))}
					</div>
				)}
				<div className="relative flex flex-row items-start gap-1 sm:gap-2">
					<div className="relative grow">
						<PromptInputTextarea
							className="grow resize-none border-0! border-none! bg-transparent p-2 text-sm outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
							data-testid="multimodal-input"
							disableAutoResize={true}
							maxHeight={200}
							minHeight={44}
							onChange={handleInput}
							onKeyDown={handleKeyDown}
							placeholder="Send a message..."
							ref={textareaRef}
							rows={1}
							value={input}
						/>
					</div>
					<Context usage={usage} />
				</div>
				<PromptInputToolbar className="!border-top-0 border-t-0! p-0 shadow-none dark:border-0 dark:border-transparent!">
					<PromptInputTools className="gap-0 sm:gap-0.5">
						<PromptInputModelSelect
							onValueChange={(modelName) => {
								const model = chatModels.find((m) => m.name === modelName);
								if (model) {
									startTransition(() => {
										onModelChange?.(model.id);
									});
								}
							}}
							value={chatModels.find((m) => m.id === selectedModelId)?.name}
						>
							<PromptInputModelSelectTrigger className="h-8 px-2">
								<CpuIcon size={16} />
								<span className="hidden font-medium text-xs sm:block" suppressHydrationWarning>
									{chatModels.find((m) => m.id === selectedModelId)?.name}
								</span>
							</PromptInputModelSelectTrigger>
							<PromptInputModelSelectContent className="min-w-[260px] p-0">
								<div className="flex flex-col gap-px">
									{chatModels.map((model) => (
										<SelectItem key={model.id} value={model.name}>
											<div className="truncate font-medium text-xs">{model.name}</div>
											<div className="mt-px truncate text-[10px] text-muted-foreground leading-tight">
												{model.description}
											</div>
										</SelectItem>
									))}
								</div>
							</PromptInputModelSelectContent>
						</PromptInputModelSelect>
						<Button
							className="aspect-square h-8 rounded-lg p-1 transition-colors hover:bg-accent hidden"
							data-testid="attachments-button"
							disabled={status !== 'ready'}
							onClick={(event) => {
								event.preventDefault();
								fileInputRef.current?.click();
							}}
							type="button"
							variant="ghost"
						>
							<PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
						</Button>
					</PromptInputTools>

					{status === 'submitted' || status === 'streaming' ? (
						<Button
							className="size-8 rounded-full bg-foreground p-1 text-background transition-colors duration-200 hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground"
							data-testid="stop-button"
							onClick={(event) => {
								event.preventDefault();
								stop();
								setMessages((messages) => messages);
							}}
							type="button"
						>
							<Pause size={14} />
						</Button>
					) : (
						<PromptInputSubmit
							className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
							disabled={!input.trim() || uploadQueue.length > 0}
							status={status}
							data-testid="send-button"
						>
							<ArrowUpIcon size={14} />
						</PromptInputSubmit>
					)}
				</PromptInputToolbar>
			</PromptInput>
			{showAutocomplete &&
				getFilteredTemplates().length > 0 &&
				dropdownPosition &&
				typeof window !== 'undefined' &&
				createPortal(
					<div
						ref={autocompleteRef}
						className="fixed w-[300px] bg-popover border border-input rounded-md shadow-lg max-h-[200px] overflow-y-auto z-[100]"
						style={{
							top: `${dropdownPosition.top}px`,
							left: `${dropdownPosition.left}px`,
							transform: 'translateY(-100%)',
						}}
					>
						{getFilteredTemplates().map((template, index) => (
							<div
								key={template.id}
								role="option"
								aria-selected={index === selectedIndex}
								tabIndex={-1}
								className={cn(
									'px-3 py-2 cursor-pointer hover:bg-accent',
									index === selectedIndex && 'bg-accent'
								)}
								onClick={() => insertTemplate(template)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') insertTemplate(template);
								}}
								onMouseEnter={() => setSelectedIndex(index)}
							>
								<div className="font-medium text-sm">{template.name}</div>
								<div className="text-xs text-muted-foreground truncate">{template.text}</div>
							</div>
						))}
					</div>,
					document.body
				)}
		</div>
	);
}

export const MultimodalInput = memo(PureMultimodalInput, (prevProps, nextProps) => {
	if (prevProps.input !== nextProps.input) {
		return false;
	}
	if (prevProps.status !== nextProps.status) {
		return false;
	}
	if (!equal(prevProps.attachments, nextProps.attachments)) {
		return false;
	}
	if (prevProps.selectedModelId !== nextProps.selectedModelId) {
		return false;
	}
	if (prevProps.messages?.length !== nextProps.messages?.length) {
		return false;
	}
	if (!equal(prevProps.usage, nextProps.usage)) {
		return false;
	}

	return true;
});
