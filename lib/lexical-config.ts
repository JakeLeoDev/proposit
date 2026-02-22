/**
 * Centralized configuration for Lexical editor node types
 * This ensures consistency across the application and provides validation
 */

/**
 * Supported Lexical node types in this application
 */
export const SUPPORTED_NODE_TYPES = {
	// Root node (always present)
	ROOT: 'root',
	// Block nodes
	PARAGRAPH: 'paragraph',
	HEADING: 'heading',
	QUOTE: 'quote',
	LIST: 'list',
	LIST_ITEM: 'listitem',
	CODE: 'code',
	// Inline nodes
	LINK: 'link',
	TEXT: 'text',
	// Table nodes
	TABLE: 'table',
	TABLE_ROW: 'tablerow',
	TABLE_CELL: 'tablecell',
	// Custom nodes
	PRODUCT_COLLECTION_BLOCK: 'product-collection-block',
	IMAGE: 'image',
} as const;

/**
 * Set of all supported node type strings
 */
export const SUPPORTED_NODE_TYPES_SET = new Set<string>(Object.values(SUPPORTED_NODE_TYPES));

/**
 * Validates if a node type is supported
 */
export function isValidNodeType(nodeType: string): boolean {
	return SUPPORTED_NODE_TYPES_SET.has(nodeType);
}

/**
 * Default empty Lexical editor state
 */
export function getDefaultContent() {
	return {
		root: {
			children: [
				{
					children: [],
					direction: null,
					format: '',
					indent: 0,
					type: SUPPORTED_NODE_TYPES.PARAGRAPH,
					version: 1,
					textFormat: 0,
					textStyle: '',
				},
			],
			direction: null,
			format: '',
			indent: 0,
			type: SUPPORTED_NODE_TYPES.ROOT,
			version: 1,
		},
	};
}

/**
 * Validation result type
 */
export interface LexicalValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Recursively validates a Lexical node
 */
function validateNode(node: any, path: string = 'root'): LexicalValidationResult {
	if (!node || typeof node !== 'object') {
		return { valid: false, error: `Node at ${path} is not an object` };
	}

	// Check node type exists
	if (!node.type || typeof node.type !== 'string') {
		return { valid: false, error: `Node at ${path} is missing type property` };
	}

	// Check if node type is supported
	if (!isValidNodeType(node.type)) {
		return { valid: false, error: `Node at ${path} has unsupported type: ${node.type}` };
	}

	// Validate node-specific requirements
	switch (node.type) {
		case SUPPORTED_NODE_TYPES.ROOT:
			// Root node must have children array
			if (!Array.isArray(node.children)) {
				return { valid: false, error: 'Root node must have children array' };
			}
			// Root node should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: 'Root node version must be 1' };
			}
			break;

		case SUPPORTED_NODE_TYPES.LIST:
			// List nodes must have listType
			if (!node.listType || (node.listType !== 'bullet' && node.listType !== 'number')) {
				return { valid: false, error: `List node at ${path} must have listType: 'bullet' or 'number'` };
			}
			// List nodes should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `List node at ${path} version must be 1` };
			}
			// List nodes must have children array
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `List node at ${path} must have children array` };
			}
			// List nodes must have direction property
			if (
				node.direction === undefined ||
				(node.direction !== 'ltr' && node.direction !== 'rtl' && node.direction !== null)
			) {
				return {
					valid: false,
					error: `List node at ${path} must have direction: 'ltr', 'rtl', or null`,
				};
			}
			// List nodes must have format property
			if (node.format === undefined || typeof node.format !== 'string') {
				return { valid: false, error: `List node at ${path} must have format property as string` };
			}
			// For numbered lists, start property must be present and >= 1
			if (node.listType === 'number') {
				if (node.start === undefined || typeof node.start !== 'number' || node.start < 1) {
					return {
						valid: false,
						error: `List node at ${path} with listType "number" must have start property as number >= 1`,
					};
				}
			}
			// List nodes inherit indent from ElementNode (always serialized as 0)
			// Only reject non-zero indent values, as indent nesting belongs to listitem nodes
			if (node.indent !== undefined && node.indent !== 0) {
				return {
					valid: false,
					error: `List node at ${path} must have indent: 0 (nesting indent belongs to listitem nodes)`,
				};
			}
			break;

		case SUPPORTED_NODE_TYPES.LIST_ITEM:
			// List item nodes should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `List item node at ${path} version must be 1` };
			}
			// List item nodes must have children array
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `List item node at ${path} must have children array` };
			}
			// List item nodes must have indent property (number >= 0)
			if (node.indent === undefined || typeof node.indent !== 'number' || node.indent < 0) {
				return {
					valid: false,
					error: `List item node at ${path} must have indent property as number >= 0`,
				};
			}
			break;

		case SUPPORTED_NODE_TYPES.TABLE:
			// Table nodes must have children array (rows)
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `Table node at ${path} must have children array` };
			}
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `Table node at ${path} version must be 1` };
			}
			break;

		case SUPPORTED_NODE_TYPES.TABLE_ROW:
			// Table row nodes must have children array (cells)
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `Table row node at ${path} must have children array` };
			}
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `Table row node at ${path} version must be 1` };
			}
			break;

		case SUPPORTED_NODE_TYPES.TABLE_CELL:
			// Table cell nodes must have children array (content)
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `Table cell node at ${path} must have children array` };
			}
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `Table cell node at ${path} version must be 1` };
			}
			// headerState must be a number if present
			if (node.headerState !== undefined && typeof node.headerState !== 'number') {
				return { valid: false, error: `Table cell node at ${path} headerState must be a number` };
			}
			break;

		case SUPPORTED_NODE_TYPES.PRODUCT_COLLECTION_BLOCK:
			// Product collection blocks must have collection_id
			if (node.collection_id === undefined || node.collection_id === null) {
				return { valid: false, error: `Product collection block at ${path} must have collection_id` };
			}
			if (typeof node.collection_id !== 'string') {
				return {
					valid: false,
					error: `Product collection block at ${path} collection_id must be a string`,
				};
			}
			// Product collection blocks should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `Product collection block at ${path} version must be 1` };
			}
			break;

		case SUPPORTED_NODE_TYPES.IMAGE:
			// Image nodes must have src
			if (!node.src || typeof node.src !== 'string') {
				return { valid: false, error: `Image node at ${path} must have src property as string` };
			}
			// Image nodes should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `Image node at ${path} version must be 1` };
			}
			break;

		case SUPPORTED_NODE_TYPES.TEXT:
			// Text nodes must have text property
			if (node.text === undefined || typeof node.text !== 'string') {
				return { valid: false, error: `Text node at ${path} must have text property as string` };
			}
			break;

		case SUPPORTED_NODE_TYPES.LINK:
			// Link nodes must have url
			if (!node.url || typeof node.url !== 'string') {
				return { valid: false, error: `Link node at ${path} must have url property as string` };
			}
			// Link nodes should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `Link node at ${path} version must be 1` };
			}
			// Link nodes must have children array
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `Link node at ${path} must have children array` };
			}
			break;

		case SUPPORTED_NODE_TYPES.PARAGRAPH:
		case SUPPORTED_NODE_TYPES.HEADING:
		case SUPPORTED_NODE_TYPES.QUOTE:
		case SUPPORTED_NODE_TYPES.CODE:
			// These block nodes should have version
			if (node.version !== undefined && node.version !== 1) {
				return { valid: false, error: `${node.type} node at ${path} version must be 1` };
			}
			// These nodes must have children array
			if (!Array.isArray(node.children)) {
				return { valid: false, error: `${node.type} node at ${path} must have children array` };
			}
			break;
	}

	// Recursively validate children if they exist
	if (Array.isArray(node.children)) {
		for (let i = 0; i < node.children.length; i++) {
			const childPath = `${path}.children[${i}]`;
			const childResult = validateNode(node.children[i], childPath);
			if (!childResult.valid) {
				return childResult;
			}
		}
	}

	return { valid: true };
}

/**
 * Validates Lexical content structure and node types
 * Returns validation result with error message if invalid
 */
export function validateLexicalContent(content: any): LexicalValidationResult {
	// Check basic structure
	if (!content || typeof content !== 'object') {
		return { valid: false, error: 'Content must be an object' };
	}

	// Check root exists
	if (!content.root || typeof content.root !== 'object') {
		return { valid: false, error: 'Content must have a root object' };
	}

	// Check root type
	if (content.root.type !== SUPPORTED_NODE_TYPES.ROOT) {
		return { valid: false, error: `Root node must have type: '${SUPPORTED_NODE_TYPES.ROOT}'` };
	}

	// Recursively validate all nodes
	return validateNode(content.root, 'root');
}

/**
 * Generates AI prompt text explaining supported node types in XML format
 */
export function getLexicalNodeTypesPrompt(): string {
	return `CRITICAL: You MUST only use the following node types when creating Lexical content. Using unsupported types (like ul, li, ol) will cause errors.

Supported Block Node Types:
- root: Root container (type: "root")
- paragraph: Text paragraph (type: "paragraph")
- heading: Heading (type: "heading", tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6")
- quote: Block quote (type: "quote")
- list: List container (type: "list", listType: "bullet" | "number", direction: "ltr" | "rtl" | null, format: string, start: number >= 1 for "number" lists)
- listitem: List item (type: "listitem", indent: number >= 0)
- code: Code block (type: "code")
- product-collection-block: Product collection block (type: "product-collection-block", collection_id: string, template_id?: string)
- table: Table container (type: "table", children: tablerow nodes)
- tablerow: Table row (type: "tablerow", children: tablecell nodes)
- tablecell: Table cell (type: "tablecell", headerState: number, colSpan?: number, rowSpan?: number, width?: number)
- image: Image (type: "image", src: string, altText?: string)

Supported Inline/Leaf Node Types:
- text: Text content (type: "text", text: string)
- link: Link (type: "link", url: string, children: text nodes)

Bullet List Structure Example (CRITICAL - follow this exact structure):
{
  "type": "list",
  "listType": "bullet",
  "version": 1,
  "direction": "ltr",
  "format": "",
  "children": [
    {
      "type": "listitem",
      "version": 1,
      "indent": 0,
      "children": [
        {
          "type": "text",
          "text": "Item 1",
          "version": 1
        }
      ]
    },
    {
      "type": "listitem",
      "version": 1,
      "indent": 0,
      "children": [
        {
          "type": "text",
          "text": "Item 2",
          "version": 1
        }
      ]
    }
  ]
}

Numbered List Structure Example (CRITICAL - follow this exact structure):
{
  "type": "list",
  "listType": "number",
  "version": 1,
  "direction": "ltr",
  "format": "",
  "start": 1,
  "children": [
    {
      "type": "listitem",
      "version": 1,
      "indent": 0,
      "children": [
        {
          "type": "text",
          "text": "First item",
          "version": 1
        }
      ]
    },
    {
      "type": "listitem",
      "version": 1,
      "indent": 0,
      "children": [
        {
          "type": "text",
          "text": "Second item",
          "version": 1
        }
      ]
    }
  ]
}

Table Structure Example (CRITICAL - follow this exact structure):
{
  "type": "table",
  "version": 1,
  "children": [
    {
      "type": "tablerow",
      "version": 1,
      "children": [
        {
          "type": "tablecell",
          "version": 1,
          "headerState": 1,
          "colSpan": 1,
          "rowSpan": 1,
          "children": [
            {
              "type": "paragraph",
              "version": 1,
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "children": [{ "type": "text", "text": "Header 1", "version": 1 }]
            }
          ]
        },
        {
          "type": "tablecell",
          "version": 1,
          "headerState": 1,
          "colSpan": 1,
          "rowSpan": 1,
          "children": [
            {
              "type": "paragraph",
              "version": 1,
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "children": [{ "type": "text", "text": "Header 2", "version": 1 }]
            }
          ]
        }
      ]
    },
    {
      "type": "tablerow",
      "version": 1,
      "children": [
        {
          "type": "tablecell",
          "version": 1,
          "headerState": 0,
          "colSpan": 1,
          "rowSpan": 1,
          "children": [
            {
              "type": "paragraph",
              "version": 1,
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "children": [{ "type": "text", "text": "Cell 1", "version": 1 }]
            }
          ]
        },
        {
          "type": "tablecell",
          "version": 1,
          "headerState": 0,
          "colSpan": 1,
          "rowSpan": 1,
          "children": [
            {
              "type": "paragraph",
              "version": 1,
              "direction": "ltr",
              "format": "",
              "indent": 0,
              "children": [{ "type": "text", "text": "Cell 2", "version": 1 }]
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT Table Node Rules:
- table nodes MUST have: type, version, children (array of tablerow nodes)
- tablerow nodes MUST have: type, version, children (array of tablecell nodes)
- tablecell nodes MUST have: type, version, headerState (0 = normal, 1 = column header, 2 = row header, 3 = both), children (content nodes like paragraph)
- tablecell nodes CAN have: colSpan (default 1), rowSpan (default 1), width (number), backgroundColor (string)
- Cell content: each tablecell must contain at least one paragraph node with children

IMPORTANT List Node Rules:
- list nodes MUST have: type, listType, version, direction, format, children
- list nodes with listType "number" MUST have: start (number >= 1, usually 1 for new lists)
- list nodes MUST NOT have: indent (indent belongs to listitem nodes only)
- listitem nodes MUST have: type, version, indent (number >= 0), children
- direction must be "ltr", "rtl", or null
- format must be a string (usually empty string "")
- indent must be a number >= 0 (0 for top-level items, higher for nested)
- start must be a number >= 1 (only for numbered lists, determines starting number)

All nodes must have version: 1 (except text nodes).`;
}

/**
 * Recursively extracts all image `src` paths from a Lexical JSON tree.
 * Returns a deduplicated array of storage paths.
 */
export function extractImagePaths(content: unknown): string[] {
	const paths = new Set<string>();

	function walk(node: any): void {
		if (!node || typeof node !== 'object') return;

		if (node.type === SUPPORTED_NODE_TYPES.IMAGE && typeof node.src === 'string' && node.src) {
			paths.add(node.src);
		}

		if (Array.isArray(node.children)) {
			for (const child of node.children) {
				walk(child);
			}
		}
	}

	if (content && typeof content === 'object' && (content as any).root) {
		walk((content as any).root);
	}

	return Array.from(paths);
}
