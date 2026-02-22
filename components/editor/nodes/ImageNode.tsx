import { DecoratorNode } from 'lexical';
import type { NodeKey, SerializedLexicalNode, Spread, LexicalNode } from 'lexical';
import type { JSX } from 'react';
import { AuthenticatedImg } from '@/components/ui/authenticated-image';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { useEditorProposalContext } from '../editor-context';

export type SerializedImageNode = Spread<
	{
		type: 'image';
		version: 1;
		src: string;
		altText?: string;
	},
	SerializedLexicalNode
>;

function ImageComponent({ src, altText }: { src: string; altText?: string }) {
	// Add Media/ prefix if it's not already present
	const imageSrc = src.startsWith('Media/') ? src : `Media/${src}`;

	// Try to detect if we're in view mode by checking for ProposalContext
	let isViewMode = false;
	let proposalId: string | null = null;
	let token: string | null = null;

	// Check if ProposalContext is available (view mode)
	try {
		const proposalContext = useProposalContext();
		isViewMode = true;
		proposalId = proposalContext.data?.proposal.id || null;
		token = proposalContext.token || null;
	} catch {
		// ProposalContext not available, we're in edit mode
		isViewMode = false;
	}

	// Always call the hook unconditionally (hooks must not be called conditionally)
	let editorProposalId: string | null = null;
	try {
		const editorContext = useEditorProposalContext();
		editorProposalId = editorContext.proposalId || null;
	} catch {
		// Editor context not available
	}

	if (!isViewMode && editorProposalId) {
		proposalId = editorProposalId;
	}

	// In view mode, use server-side API for image loading
	if (isViewMode && proposalId) {
		// For server-side API, use the original src without Media/ prefix
		const serverImageSrc = `/api/proposals/${proposalId}/images/${src}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
		return <img src={serverImageSrc} alt={altText || ''} className="max-w-full" />;
	}

	// In edit mode or when no proposal ID available, use authenticated image component
	return <AuthenticatedImg src={imageSrc} alt={altText || ''} className="max-w-full" />;
}

export class ImageNode extends DecoratorNode<JSX.Element> {
	__src: string;
	__altText: string;

	static getType(): string {
		return 'image';
	}

	static clone(node: ImageNode): ImageNode {
		return new ImageNode(node.__src, node.__altText, node.__key);
	}

	static importJSON(serializedNode: SerializedImageNode): ImageNode {
		const { src, altText } = serializedNode;
		return new ImageNode(src, altText);
	}

	exportJSON(): SerializedImageNode {
		return {
			...super.exportJSON(),
			type: 'image',
			version: 1,
			src: this.__src,
			altText: this.__altText,
		};
	}

	createDOM(): HTMLElement {
		return document.createElement('span');
	}

	updateDOM(): false {
		return false;
	}

	decorate(): JSX.Element {
		return <ImageComponent src={this.__src} altText={this.__altText} />;
	}

	constructor(src: string, altText?: string, key?: NodeKey) {
		super(key);
		this.__src = src;
		this.__altText = altText || '';
	}
}

export function $createImageNode(src: string, altText?: string): ImageNode {
	return new ImageNode(src, altText);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
	return node instanceof ImageNode;
}
