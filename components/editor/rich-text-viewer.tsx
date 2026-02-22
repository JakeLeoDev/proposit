'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ParagraphNode } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ProductCollectionBlockNode } from './nodes/ProductCollectionBlockNode';
import { ImageNode } from './nodes/ImageNode';
import { EditorProposalProvider } from './editor-context';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useDocument } from '@/components/viewer/contexts/DocumentContext';

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
		nested: { listitem: 'text-foreground' },
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
	tableCell: 'border border-border p-2 text-foreground align-top',
	tableCellHeader: 'border border-border p-2 bg-muted text-foreground font-semibold align-top',
	tableRow: '',
	tableRowStriping: 'even:bg-muted/30',
};

function HeadingCollectorPlugin() {
	const [editor] = useLexicalComposerContext();
	const { setHeadings } = useDocument();

	useEffect(() => {
		const collect = () => {
			const root = editor.getRootElement();
			if (!root) return;

			// Extract headings from the current module content
			const elems = Array.from(root.querySelectorAll('h1,h2,h3')) as HTMLElement[];
			const list = elems.map((el, idx) => {
				let id = el.getAttribute('id');
				const text = (el.textContent || '').trim();
				const level = Number(el.tagName.substring(1));

				if (!id) {
					const base =
						text
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, '-')
							.replace(/(^-|-$)/g, '') || `section-${idx}`;
					id = `${base}-${idx}`;
					el.setAttribute('id', id);
				}

				return { id, text, level } as const;
			});

			// Headings collected from module
			setHeadings(list);
		};

		collect();
		return editor.registerUpdateListener(() => collect());
	}, [editor, setHeadings]);

	return null;
}

interface RichTextViewerProps {
	value?: string;
	className?: string;
	proposalId?: string;
	minHeight?: string;
}

export function RichTextViewer({
	value,
	className,
	proposalId,
	minHeight = '200px',
}: RichTextViewerProps) {
	const config = {
		namespace: 'RichTextViewer',
		theme,
		onError: (_error: Error) => {
			// Handle error silently in view mode
		},
		editorState: value ? value : undefined,
		nodes: [
			ParagraphNode,
			HeadingNode,
			QuoteNode,
			ListNode,
			ListItemNode,
			LinkNode,
			TableNode,
			TableCellNode,
			TableRowNode,
			ProductCollectionBlockNode,
			ImageNode,
		],
		editable: false as unknown as undefined,
	};

	return (
		<div className={cn('w-full', className)}>
			<EditorProposalProvider proposalId={proposalId}>
				<LexicalComposer initialConfig={config}>
					<HeadingCollectorPlugin />
					<div className="bg-white">
						<RichTextPlugin
							contentEditable={
								<ContentEditable
									className="min-h-[200px] w-full px-3 py-2 text-sm text-foreground"
									style={{ minHeight }}
									readOnly
								/>
							}
							ErrorBoundary={LexicalErrorBoundary}
						/>
						<HistoryPlugin />
						<ListPlugin />
						<TablePlugin />
					</div>
				</LexicalComposer>
			</EditorProposalProvider>
		</div>
	);
}
