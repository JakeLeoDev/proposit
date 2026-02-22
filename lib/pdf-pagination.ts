// PDF Pagination Utilities for A4 Page Layout

export interface A4Dimensions {
	width: number;
	height: number;
	contentHeight: number; // Available height for content (excluding padding)
}

export interface LexicalNode {
	type?: string;
	children?: LexicalNode[];
	text?: string;
	tag?: string;
	version?: number;
	[key: string]: unknown;
}

export interface LexicalRoot {
	type: 'root';
	version: number;
	children: LexicalNode[];
	direction?: string;
	format?: string;
	indent?: number;
	[key: string]: unknown;
}

export interface LexicalState {
	root: LexicalRoot;
	[key: string]: unknown;
}

// A4 dimensions at 96 DPI: 210mm × 297mm = 793.7px × 1122.5px
// Using exact mm values for consistency with CSS
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Padding in mm (15mm top, 12mm sides, 20mm bottom for footer)
export const PAGE_PADDING = {
	top: 15,
	right: 12,
	bottom: 20,
	left: 12,
};

export function getA4Dimensions(): A4Dimensions {
	return {
		width: A4_WIDTH_MM,
		height: A4_HEIGHT_MM,
		contentHeight: A4_HEIGHT_MM - PAGE_PADDING.top - PAGE_PADDING.bottom,
	};
}

/**
 * Measures the height of a DOM element in millimeters
 */
export function measureElementHeight(element: HTMLElement): number {
	const rect = element.getBoundingClientRect();
	// Convert pixels to mm (96 DPI: 1mm = 3.7795275591 pixels)
	return rect.height / 3.7795275591;
}

/**
 * Creates a basic Lexical state with empty content
 */
export function createBasicLexicalState(): LexicalState {
	return {
		root: {
			type: 'root',
			version: 1,
			children: [],
			direction: 'ltr',
			format: '',
			indent: 0,
		},
	};
}

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Builds a Lexical state from a subset of children nodes
 */
export function buildLexicalFromSubset(
	original: LexicalState,
	childrenSubset: LexicalNode[]
): LexicalState {
	const cloned = deepClone(original);
	cloned.root = {
		...cloned.root,
		type: 'root',
		children: deepClone(childrenSubset),
	};
	return cloned;
}

/**
 * @deprecated This function is deprecated in favor of CSS-based automatic pagination.
 * Use the `.auto-paginated-page` and `.auto-paginated-content` CSS classes instead.
 * See PDF_PAGINATION.md for more information.
 *
 * Splits Lexical content into chunks by node count
 * Used as a fallback when precise measurement isn't available
 */
export function splitLexicalByNodes(
	content: LexicalState,
	maxNodesPerChunk: number = 10
): LexicalState[] {
	const children = content.root.children || [];

	if (children.length === 0) {
		return [content];
	}

	const chunks: LexicalState[] = [];

	for (let i = 0; i < children.length; i += maxNodesPerChunk) {
		const chunkNodes = children.slice(i, i + maxNodesPerChunk);
		chunks.push(buildLexicalFromSubset(content, chunkNodes));
	}

	return chunks;
}

/**
 * Estimates if content will fit on a page based on node count
 * This is a heuristic - actual rendering may vary
 */
export function estimateContentFitsOnPage(nodeCount: number): boolean {
	// Rough estimate: ~15-20 nodes per page depending on content type
	// This is conservative to avoid overflow
	return nodeCount <= 15;
}

/**
 * @deprecated This function is deprecated in favor of CSS-based automatic pagination.
 * Use the `.auto-paginated-page` and `.auto-paginated-content` CSS classes instead.
 * See PDF_PAGINATION.md for more information.
 *
 * Splits Lexical content more intelligently by trying to keep related content together
 */
export function splitLexicalIntoPages(content: LexicalState): LexicalState[] {
	const children = content.root.children || [];

	if (children.length === 0) {
		return [content];
	}

	// If content is small, return as single page
	if (estimateContentFitsOnPage(children.length)) {
		return [content];
	}

	const pages: LexicalState[] = [];
	let currentPageNodes: LexicalNode[] = [];

	for (const node of children) {
		currentPageNodes.push(node);

		// Check if we should start a new page
		// Start new page after ~12-15 nodes to be safe
		if (currentPageNodes.length >= 9) {
			pages.push(buildLexicalFromSubset(content, currentPageNodes));
			currentPageNodes = [];
		}
	}

	// Add remaining nodes
	if (currentPageNodes.length > 0) {
		pages.push(buildLexicalFromSubset(content, currentPageNodes));
	}

	return pages.length > 0 ? pages : [content];
}

/**
 * Checks if a value is a valid Lexical state
 */
export function isLexicalState(value: unknown): value is LexicalState {
	if (!value || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	if (!obj.root || typeof obj.root !== 'object') return false;
	const root = obj.root as Record<string, unknown>;
	return root.type === 'root' && Array.isArray(root.children);
}

/**
 * Parses content to Lexical state
 */
export function parseToLexicalState(content: unknown): LexicalState | null {
	try {
		if (!content) return null;

		if (typeof content === 'string') {
			const parsed = JSON.parse(content);
			return isLexicalState(parsed) ? parsed : null;
		}

		if (typeof content === 'object') {
			if (isLexicalState(content)) {
				return content as LexicalState;
			}
			const stringified = JSON.stringify(content);
			const parsed = JSON.parse(stringified);
			return isLexicalState(parsed) ? parsed : null;
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Creates a heading node for Lexical
 */
export function createHeadingNode(text: string, tag: 'h1' | 'h2' = 'h1'): LexicalNode {
	return {
		type: 'heading',
		version: 1,
		tag,
		children: [
			{
				type: 'text',
				version: 1,
				text,
				format: 0,
				style: '',
				mode: 'normal',
				detail: 0,
			},
		],
		direction: 'ltr',
		format: '',
		indent: 0,
	};
}

/**
 * Creates a paragraph node for Lexical
 */
export function createParagraphNode(text: string): LexicalNode {
	return {
		type: 'paragraph',
		version: 1,
		children: [
			{
				type: 'text',
				version: 1,
				text,
				format: 0,
				style: '',
				mode: 'normal',
				detail: 0,
			},
		],
		direction: 'ltr',
		format: '',
		indent: 0,
	};
}

/**
 * Injects title and description at the beginning of Lexical content
 */
export function injectTitleAndDescription(
	content: unknown,
	name: string,
	description?: string
): LexicalState {
	const nodes: LexicalNode[] = [];
	nodes.push(createHeadingNode(name, 'h1'));

	if (description && description.trim().length > 0) {
		nodes.push(createParagraphNode(description));
	}

	const existing = parseToLexicalState(content);

	if (existing?.root?.children && existing.root.children.length > 0) {
		const cleaned = existing.root.children.map((node: LexicalNode) => {
			if (node.type === 'paragraph') {
				// Remove legacy properties if present
				const {
					textFormat: _textFormat,
					textStyle: _textStyle,
					...clean
				} = node as LexicalNode & { textFormat?: unknown; textStyle?: unknown };
				return clean;
			}
			return node;
		});
		nodes.push(...cleaned);
	}

	const base = existing || createBasicLexicalState();
	return {
		...base,
		root: {
			...base.root,
			children: nodes,
		},
	};
}
