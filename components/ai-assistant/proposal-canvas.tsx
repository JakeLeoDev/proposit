'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Loader2, X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';
import { validateLexicalContent } from '@/lib/lexical-config';
import { proposalsService } from '@/lib/proposals-service';

export type CanvasState = 'loading' | 'successful' | 'failure' | 'empty';

export interface ProposalCanvasHandle {
	openProposal: (proposalId: string) => void;
	isOpen: () => boolean;
	getProposalId: () => string | null;
}

interface ProposalCanvasProps {
	messages: ChatMessage[];
	onValidationError?: (error: string) => void;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const DEFAULT_ZOOM_INDEX = 1; // 75%

export const ProposalCanvas = forwardRef<ProposalCanvasHandle, ProposalCanvasProps>(
	({ messages, onValidationError }, ref) => {
		const t = useTranslations('common');
		const router = useRouter();
		const searchParams = useSearchParams();
		const params = useParams();
		const locale = params.locale as string;

		// Canvas state
		const [proposalId, setProposalId] = useState<string | null>(null);
		const [state, setState] = useState<CanvasState>('empty');
		const [isOpen, setIsOpen] = useState(false);
		const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
		const [iframeKey, setIframeKey] = useState(0);
		const iframeRef = useRef<HTMLIFrameElement>(null);
		// Track processed tool calls to prevent double rendering
		const processedToolCallsRef = useRef<Set<string>>(new Set());

		const zoom = ZOOM_LEVELS[zoomIndex];

		// Expose openProposal function to parent via ref
		useImperativeHandle(ref, () => ({
			openProposal: (id: string) => {
				setProposalId(id);
				setState('loading');
				setIsOpen(true);
			},
			isOpen: () => isOpen,
			getProposalId: () => proposalId,
		}));

		// Read proposalId from URL on mount
		useEffect(() => {
			const proposalIdParam = searchParams.get('proposalId');
			if (proposalIdParam) {
				setProposalId(proposalIdParam);
				setState('loading');
				setIsOpen(true);
				// Remove parameter from URL
				const newSearchParams = new URLSearchParams(searchParams.toString());
				newSearchParams.delete('proposalId');
				const newUrl = newSearchParams.toString()
					? `${window.location.pathname}?${newSearchParams.toString()}`
					: window.location.pathname;
				router.replace(newUrl);
			}
		}, [searchParams, router]);

		// Monitor tool calls for proposal create/update
		useEffect(() => {
			const lastMessage = messages[messages.length - 1];
			if (!lastMessage || lastMessage.role !== 'assistant') {
				return;
			}

			// Find proposal tool calls
			const toolParts = lastMessage.parts?.filter((part: any) => {
				return (
					part.type?.includes('createProposal') ||
					part.type?.includes('updateProposal') ||
					part.toolName === 'createProposal' ||
					part.toolName === 'updateProposal'
				);
			});

			if (!toolParts || toolParts.length === 0) {
				return;
			}

			const toolPart = toolParts[toolParts.length - 1] as any;

			// Create a unique identifier for this tool call
			// Use toolCallId if available, otherwise use message id + part index
			const toolCallId =
				toolPart.toolCallId ||
				`${lastMessage.id}-${toolParts.length - 1}-${toolPart.toolName || toolPart.type}`;

			// Tool call starting
			if (toolPart.state === 'input-available' && !toolPart.output && proposalId) {
				setState('empty');
			}

			// Tool call completed successfully - only process once per tool call
			if (toolPart.state === 'output-available' && toolPart.output) {
				// Check if we've already processed this tool call
				if (processedToolCallsRef.current.has(toolCallId)) {
					return;
				}

				const output = toolPart.output as any;
				if (output.success && output.proposal?.id) {
					// Mark this tool call as processed
					processedToolCallsRef.current.add(toolCallId);

					const newProposalId = output.proposal.id;
					setIsOpen(true);
					if (newProposalId !== proposalId) {
						setProposalId(newProposalId);
						setState('loading');
					} else {
						// Same proposal, reload
						setState('loading');
						setIframeKey((prev) => prev + 1);
					}

					// Run client-side validation for updateProposal calls
					const isUpdateCall =
						toolPart.toolName === 'updateProposal' || toolPart.type?.includes('updateProposal');
					if (isUpdateCall && onValidationError) {
						// Async validation
						(async () => {
							try {
								toast.info(t('validatingContent'));

								// Fetch the proposal from database
								const proposal = await proposalsService.getProposal(newProposalId);

								if (!proposal) {
									toast.error(t('failedToFetchForValidation'));
									return;
								}

								// Parse content (it's stored as JSON string)
								let parsedContent;
								try {
									parsedContent =
										typeof proposal.content === 'string' ? JSON.parse(proposal.content) : proposal.content;
								} catch {
									const errorMsg = 'Content is not valid JSON';
									toast.error(t('validationFailed', { error: errorMsg }));
									onValidationError(errorMsg);
									return;
								}

								// Validate content
								const validationResult = validateLexicalContent(parsedContent);

								if (validationResult.valid) {
									toast.success(t('validationSuccessful'));
								} else {
									const errorMsg = validationResult.error || t('invalidContent');
									toast.error(t('validationFailed', { error: errorMsg }));
									onValidationError(errorMsg);
								}
							} catch (error) {
								console.error('Validation error:', error);
								toast.error(t('failedToValidate'));
							}
						})();
					}
				} else if (output.success === false && proposalId) {
					// Mark as processed even on failure to prevent retries
					processedToolCallsRef.current.add(toolCallId);
					setState('failure');
				}
			}

			// Tool call error - only process once per tool call
			if (toolPart.state === 'output-error' && proposalId) {
				// Check if we've already processed this tool call
				if (processedToolCallsRef.current.has(toolCallId)) {
					return;
				}
				// Mark as processed
				processedToolCallsRef.current.add(toolCallId);
				setState('failure');
			}
		}, [messages, proposalId]);

		const handleZoomIn = () => {
			if (zoomIndex < ZOOM_LEVELS.length - 1) {
				setZoomIndex(zoomIndex + 1);
			}
		};

		const handleZoomOut = () => {
			if (zoomIndex > 0) {
				setZoomIndex(zoomIndex - 1);
			}
		};

		const handleClose = () => {
			setIsOpen(false);
		};

		const handleReload = () => {
			if (proposalId) {
				setState('loading');
				setIframeKey((prev) => prev + 1);
			}
		};

		const handleIframeLoad = () => {
			if (state === 'loading' || state === 'empty') {
				setState('successful');
			}
		};

		const handleIframeError = () => {
			if (state === 'loading' || state === 'empty') {
				setState('failure');
			}
		};

		const iframeUrl = proposalId
			? `/${locale}/proposals/${proposalId}?preview=true&canvas=true`
			: null;

		return (
			<>
				<div
					className={`relative flex h-full flex-col bg-background transition-all duration-200 ${
						isOpen ? 'w-1/2 border-l border-border' : 'w-0 overflow-hidden'
					}`}
				>
					{/* Control buttons - no visible header */}
					<div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pointer-events-none">
						{/* Zoom controls - left side */}
						<div className="flex items-center pointer-events-auto bg-background rounded-full shadow-sm overflow-hidden">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-none"
								onClick={handleZoomOut}
								disabled={zoomIndex === 0}
								aria-label="Zoom out"
							>
								<ZoomOut className="h-4 w-4" />
							</Button>
							<span className="h-8 flex items-center justify-center text-xs font-medium text-foreground px-3 min-w-[3rem] text-center border-x border-border">
								{zoom}%
							</span>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-none"
								onClick={handleZoomIn}
								disabled={zoomIndex === ZOOM_LEVELS.length - 1}
								aria-label="Zoom in"
							>
								<ZoomIn className="h-4 w-4" />
							</Button>
						</div>

						{/* Refresh and Close buttons - right side */}
						<div className="flex items-center gap-2 pointer-events-auto">
							{proposalId && (
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-full shadow-sm bg-background"
									onClick={handleReload}
									aria-label="Refresh proposal"
									disabled={state === 'loading'}
								>
									<RefreshCw className={`h-4 w-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
								</Button>
							)}
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full shadow-sm bg-background"
								onClick={handleClose}
								aria-label="Close canvas"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Canvas content */}
					<div className="flex-1 overflow-hidden relative">
						{state === 'loading' ||
							(state === 'empty' && (
								<div className="absolute inset-0 flex items-center justify-center bg-background z-20">
									<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
								</div>
							))}
						{state === 'failure' && (
							<div className="absolute inset-0 flex items-center justify-center bg-background z-20">
								<div className="text-center">
									<p className="text-muted-foreground mb-4">Failed to load proposal</p>
									<Button onClick={handleReload} variant="outline" size="sm">
										Retry
									</Button>
								</div>
							</div>
						)}
						{iframeUrl && (
							<div
								className="h-full w-full overflow-auto"
								style={{
									transform: `scale(${zoom / 100})`,
									transformOrigin: 'top left',
									width: `${100 / (zoom / 100)}%`,
									height: `${100 / (zoom / 100)}%`,
								}}
							>
								<iframe
									key={iframeKey}
									ref={iframeRef}
									src={iframeUrl || undefined}
									className="h-full w-full border-0"
									onLoad={handleIframeLoad}
									onError={handleIframeError}
									title="Proposal Preview"
								/>
							</div>
						)}
					</div>
				</div>
			</>
		);
	}
);

ProposalCanvas.displayName = 'ProposalCanvas';
