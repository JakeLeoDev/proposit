import {
	createCommand,
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	type LexicalEditor,
} from 'lexical';
import { $createQuoteNode, type HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	$isListItemNode,
} from '@lexical/list';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import type { LucideIcon } from 'lucide-react';
import {
	Boxes,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	IndentDecrease,
	IndentIncrease,
	List,
	ListOrdered,
	Quote,
	Table2,
	Type,
} from 'lucide-react';
import { $createProductCollectionBlockNode } from './nodes/ProductCollectionBlockNode';

export interface EditorActionContext {
	enableProductCollections?: boolean;
}

export interface EditorActionDefinition {
	id: string;
	label: string;
	icon: LucideIcon;
	keywords: string[];
	description?: string;
	perform: (editor: LexicalEditor) => void;
	isAvailable?: (context: EditorActionContext) => boolean;
}

export interface HeadingActionDefinition extends EditorActionDefinition {
	tag: HeadingTagType;
}

export const CHANGE_HEADING_COMMAND = createCommand<HeadingTagType>('CHANGE_HEADING_COMMAND');

export const HEADING_OPTIONS: HeadingActionDefinition[] = [
	{
		id: 'heading-1',
		tag: 'h1',
		label: 'Heading 1',
		icon: Heading1,
		description: 'Große Überschrift',
		keywords: ['heading', 'title', 'überschrift', 'h1'],
		perform: (editor) => editor.dispatchCommand(CHANGE_HEADING_COMMAND, 'h1'),
	},
	{
		id: 'heading-2',
		tag: 'h2',
		label: 'Heading 2',
		icon: Heading2,
		description: 'Abschnitt Überschrift',
		keywords: ['heading', 'subtitle', 'überschrift', 'h2'],
		perform: (editor) => editor.dispatchCommand(CHANGE_HEADING_COMMAND, 'h2'),
	},
	{
		id: 'heading-3',
		tag: 'h3',
		label: 'Heading 3',
		icon: Heading3,
		description: 'Unterüberschrift',
		keywords: ['heading', 'untertitel', 'überschrift', 'h3'],
		perform: (editor) => editor.dispatchCommand(CHANGE_HEADING_COMMAND, 'h3'),
	},
	{
		id: 'heading-4',
		tag: 'h4',
		label: 'Heading 4',
		icon: Heading4,
		description: 'Kleine Überschrift',
		keywords: ['heading', 'überschrift', 'h4'],
		perform: (editor) => editor.dispatchCommand(CHANGE_HEADING_COMMAND, 'h4'),
	},
	{
		id: 'heading-5',
		tag: 'h5',
		label: 'Heading 5',
		icon: Heading5,
		description: 'Sehr kleine Überschrift',
		keywords: ['heading', 'überschrift', 'h5'],
		perform: (editor) => editor.dispatchCommand(CHANGE_HEADING_COMMAND, 'h5'),
	},
	{
		id: 'heading-6',
		tag: 'h6',
		label: 'Heading 6',
		icon: Heading6,
		description: 'Mini Überschrift',
		keywords: ['heading', 'überschrift', 'h6'],
		perform: (editor) => editor.dispatchCommand(CHANGE_HEADING_COMMAND, 'h6'),
	},
];

export const PARAGRAPH_ACTION: EditorActionDefinition = {
	id: 'paragraph',
	label: 'Paragraph',
	icon: Type,
	description: 'Normaler Textabsatz',
	keywords: ['text', 'paragraph', 'absatz', 'p'],
	perform: (editor) =>
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				$setBlocksType(selection, () => $createParagraphNode());
			}
		}),
};

export const QUOTE_ACTION: EditorActionDefinition = {
	id: 'quote',
	label: 'Quote',
	icon: Quote,
	description: 'Zitat Block',
	keywords: ['quote', 'zitat'],
	perform: (editor) =>
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				$setBlocksType(selection, () => $createQuoteNode());
			}
		}),
};

export const BULLETED_LIST_ACTION: EditorActionDefinition = {
	id: 'unordered-list',
	label: 'Bulleted List',
	icon: List,
	description: 'Aufzählungsliste',
	keywords: ['list', 'bullets', 'unordered', 'liste'],
	perform: (editor) => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
};

export const NUMBERED_LIST_ACTION: EditorActionDefinition = {
	id: 'ordered-list',
	label: 'Numbered List',
	icon: ListOrdered,
	description: 'Nummerierte Liste',
	keywords: ['list', 'ordered', 'numbered', 'liste'],
	perform: (editor) => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
};

export const INDENT_LIST_ACTION: EditorActionDefinition = {
	id: 'indent-list',
	label: 'Indent List',
	icon: IndentIncrease,
	description: 'Liste einrücken',
	keywords: ['indent', 'einrücken', 'list'],
	perform: (editor) => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const anchorNode = selection.anchor.getNode();
				let listItemNode = anchorNode;
				while (listItemNode && !$isListItemNode(listItemNode)) {
					const parent = listItemNode.getParent();
					if (!parent) return;
					listItemNode = parent;
				}
				if (listItemNode && $isListItemNode(listItemNode)) {
					const currentIndent = listItemNode.getIndent();
					listItemNode.setIndent(currentIndent + 1);
				}
			}
		});
	},
};

export const OUTDENT_LIST_ACTION: EditorActionDefinition = {
	id: 'outdent-list',
	label: 'Outdent List',
	icon: IndentDecrease,
	description: 'Liste ausrücken',
	keywords: ['outdent', 'ausrücken', 'list'],
	perform: (editor) => {
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const anchorNode = selection.anchor.getNode();
				let listItemNode = anchorNode;
				while (listItemNode && !$isListItemNode(listItemNode)) {
					const parent = listItemNode.getParent();
					if (!parent) return;
					listItemNode = parent;
				}
				if (listItemNode && $isListItemNode(listItemNode)) {
					const currentIndent = listItemNode.getIndent();
					listItemNode.setIndent(Math.max(0, currentIndent - 1));
				}
			}
		});
	},
};

export const TABLE_ACTION: EditorActionDefinition = {
	id: 'table',
	label: 'Table',
	icon: Table2,
	description: 'Tabelle einfügen',
	keywords: ['table', 'tabelle', 'grid', 'raster'],
	perform: (editor) =>
		editor.dispatchCommand(INSERT_TABLE_COMMAND, {
			columns: '3',
			rows: '3',
			includeHeaders: true,
		}),
};

export const PRODUCT_COLLECTION_ACTION: EditorActionDefinition = {
	id: 'product-collection-block',
	label: 'Produkt Collection',
	icon: Boxes,
	description: 'Fügt eine Produkt-Collection ein',
	keywords: ['product', 'collection', 'produkte'],
	isAvailable: (context) => Boolean(context.enableProductCollections),
	perform: (editor) =>
		editor.update(() => {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				selection.insertNodes([$createProductCollectionBlockNode(null, null)]);
			}
		}),
};

export function getSlashCommandDefinitions(context: EditorActionContext): EditorActionDefinition[] {
	const actions: EditorActionDefinition[] = [
		...HEADING_OPTIONS,
		PARAGRAPH_ACTION,
		QUOTE_ACTION,
		BULLETED_LIST_ACTION,
		NUMBERED_LIST_ACTION,
		TABLE_ACTION,
		PRODUCT_COLLECTION_ACTION,
	];

	return actions.filter((action) => !action.isAvailable || action.isAvailable(context));
}
