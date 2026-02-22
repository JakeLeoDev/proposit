'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import type { EditorState } from 'lexical';
import { ParagraphNode } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { CodeNode } from '@lexical/code';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { Toolbar } from './toolbar';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { ProductCollectionBlockNode } from './nodes/ProductCollectionBlockNode';
import { ImageNode } from './nodes/ImageNode';
import { EditorProposalProvider } from './editor-context';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { createPortal } from 'react-dom';
import { SlashCommandPlugin } from './slash-command-plugin';
import { ListIndentPlugin } from './list-indent-plugin';
import { TableActionsPlugin } from './table-actions-plugin';

const theme = {
	paragraph: 'mb-4 leading-relaxed text-foreground',
	heading: {
		h1: 'text-3xl font-bold mb-4 text-foreground',
		h2: 'text-2xl font-bold mb-3 text-foreground',
		h3: 'text-xl font-bold mb-2 text-foreground',
		h4: 'text-lg font-bold mb-2 text-foreground',
		h5: 'text-base font-bold mb-2 text-foreground',
		h6: 'text-sm font-bold mb-2 text-foreground',
	},
	list: {
		ul: 'list-disc list-outside mb-4 space-y-1 text-foreground pl-6',
		ol: 'list-decimal list-outside mb-4 space-y-1 text-foreground pl-6',
		listitem: 'text-foreground',
		nested: {
			listitem: 'text-foreground',
		},
	},
	text: {
		bold: 'font-bold',
		italic: 'italic',
		underline: 'underline',
		code: 'bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground',
	},
	code: 'bg-muted p-4 rounded-lg font-mono text-sm text-foreground mb-4 overflow-x-auto border',
	quote: 'border-l-4 border-primary pl-4 italic text-muted-foreground mb-4',
	link: 'text-primary underline hover:text-primary/80',
	table: 'w-full border-collapse mb-4 table-fixed',
	tableCell: 'border border-border p-2 text-foreground relative align-top min-w-[75px]',
	tableCellHeader:
		'border border-border p-2 bg-muted text-foreground font-semibold relative align-top min-w-[75px]',
	tableRow: '',
	tableRowStriping: 'even:bg-muted/30',
};

// Plugin to handle external value updates
function ExternalValuePlugin({ value }: { value?: string }) {
	const [editor] = useLexicalComposerContext();
	const lastValueRef = useRef<string | undefined>(value);
	const isInternalChangeRef = useRef(false);

	useEffect(() => {
		// Only update if the value changed from outside (not from internal editor changes)
		if (value !== lastValueRef.current && value && !isInternalChangeRef.current) {
			try {
				const editorState = editor.parseEditorState(value);
				// Defer to microtask to avoid flushSync inside React lifecycle
				queueMicrotask(() => {
					editor.setEditorState(editorState);
				});
				lastValueRef.current = value;
			} catch (error) {
				console.error('Failed to parse editor state:', error);
			}
		}
		// Reset the internal change flag
		isInternalChangeRef.current = false;
	}, [value, editor]);

	// Listen to internal editor changes to prevent external updates during typing
	useEffect(() => {
		return editor.registerUpdateListener(() => {
			isInternalChangeRef.current = true;
		});
	}, [editor]);

	return null;
}

interface RichTextEditorProps {
	value?: string;
	onChange?: (content: string) => void;
	placeholder?: string;
	className?: string;
	minHeight?: string;
	proposalId?: string;
	enableProductCollections?: boolean;
	enableFullscreen?: boolean;
	topSpacing?: number;
}

export function RichTextEditor({
	value,
	onChange,
	placeholder,
	className,
	minHeight = '200px',
	proposalId,
	enableProductCollections = false,
	enableFullscreen = true,
	topSpacing,
}: RichTextEditorProps) {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (!enableFullscreen) return;
		if (typeof document === 'undefined') return;
		setPortalElement(document.body);
	}, [enableFullscreen]);

	useEffect(() => {
		if (!enableFullscreen || !isFullscreen) return;
		if (typeof document === 'undefined') return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [enableFullscreen, isFullscreen]);

	useEffect(() => {
		if (!enableFullscreen || !isFullscreen) return;
		if (typeof window === 'undefined') return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsFullscreen(false);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [enableFullscreen, isFullscreen]);

	const nodes = useMemo(
		() => [
			ParagraphNode,
			HeadingNode,
			QuoteNode,
			ListNode,
			ListItemNode,
			LinkNode,
			CodeNode,
			TableNode,
			TableCellNode,
			TableRowNode,
			...(enableProductCollections ? [ProductCollectionBlockNode] : []),
			ImageNode,
		],
		[enableProductCollections]
	);

	const config = {
		namespace: 'RichTextEditor',
		theme,
		onError: console.error,
		editorState: value ? value : undefined,
		nodes,
	};

	const handleChange = (editorState: EditorState) => {
		if (onChange) {
			onChange(JSON.stringify(editorState.toJSON()));
		}
	};

	const handleToggleFullscreen = () => {
		if (!enableFullscreen) return;
		setIsFullscreen((prev) => !prev);
	};

	const editorCore = (
		<EditorProposalProvider proposalId={proposalId}>
			<LexicalComposer initialConfig={config}>
				<div
					className={cn(
						'border bg-background flex flex-col rounded-md',
						isFullscreen ? 'h-full min-h-0 border-border/80 shadow-2xl' : ''
					)}
				>
					<Toolbar
						enableProductCollections={enableProductCollections}
						onToggleFullscreen={enableFullscreen ? handleToggleFullscreen : undefined}
						isFullscreen={isFullscreen}
						topSpacing={topSpacing}
					/>
					<OnChangePlugin onChange={handleChange} />
					<ExternalValuePlugin value={value} />
					<RichTextPlugin
						contentEditable={
							<ContentEditable
								className={cn(
									'w-full px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
									isFullscreen ? 'min-h-[70vh] flex-1 overflow-y-auto text-base' : 'min-h-[200px]'
								)}
								style={isFullscreen ? undefined : { minHeight }}
							/>
						}
						placeholder={<div className="text-sm text-muted-foreground">{placeholder}</div>}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<HistoryPlugin />
					<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
					<ListPlugin />
					<ListIndentPlugin />
					<TablePlugin />
					<TableActionsPlugin />
					<SlashCommandPlugin enableProductCollections={enableProductCollections} />
				</div>
			</LexicalComposer>
		</EditorProposalProvider>
	);

	if (enableFullscreen && isFullscreen && portalElement) {
		return createPortal(
			<div
				className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-lg"
				role="button"
				tabIndex={0}
				onClick={handleToggleFullscreen}
				onKeyDown={(e) => {
					if (e.key === 'Escape') handleToggleFullscreen();
				}}
			>
				<div
					className={cn('h-full w-full max-w-6xl overflow-hidden  bg-background shadow-2xl', className)}
					role="presentation"
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
				>
					{editorCore}
				</div>
			</div>,
			portalElement
		);
	}

	return <div className={cn('w-full', className)}>{editorCore}</div>;
}
