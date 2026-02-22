'use client';

import { useTranslations } from 'next-intl';
import { useDocument } from '@/components/viewer/contexts/DocumentContext';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';

interface ContentModule {
	id: string;
	title: string;
	level: number;
}

/**
 * Type guards and helpers for Lexical JSON
 */
type LexicalNode = any;
type LexicalRoot = {
	type: 'root';
	version: number;
	children: LexicalNode[];
	[key: string]: any;
};
type LexicalState = {
	root: LexicalRoot;
	[key: string]: any;
};

function isLexicalState(value: unknown): value is LexicalState {
	return !!(
		value &&
		typeof value === 'object' &&
		(value as any).root &&
		(value as any).root.type === 'root' &&
		Array.isArray((value as any).root.children)
	);
}

function getNodePlainText(node: LexicalNode): string {
	if (!node) return '';
	if (node.type === 'text') return node.text ?? '';
	if (Array.isArray(node.children)) {
		return node.children.map(getNodePlainText).join('');
	}
	return '';
}

/**
 * Extract module information from Lexical content by finding H1 headings
 */
function extractModulesFromLexical(
	content: LexicalState,
	sectionLabel: (n: number) => string
): ContentModule[] {
	const children = content.root.children ?? [];
	const modules: ContentModule[] = [];
	let moduleCount = 0;

	for (const node of children) {
		if (node?.type === 'heading' && node?.tag === 'h1') {
			moduleCount += 1;
			const title = getNodePlainText(node) || '';
			modules.push({
				id: `module-${moduleCount}`,
				title: title || sectionLabel(moduleCount),
				level: 1,
			});
		}
	}

	return modules;
}

export default function SectionOverview() {
	const t = useTranslations('viewer');
	const { scrollToModule } = useDocument();
	const { data } = useProposalContext();

	// Extract modules from the proposal content
	const modules: ContentModule[] = (() => {
		try {
			let raw: any;
			if (!data?.proposal?.content) return [];
			if (typeof data.proposal.content === 'string') {
				raw = JSON.parse(data.proposal.content as string);
			} else {
				raw = data.proposal.content;
			}

			if (isLexicalState(raw)) {
				return extractModulesFromLexical(raw, (n) => t('section', { number: n }));
			}
			return [];
		} catch (error) {
			console.error('Error parsing proposal content:', error);
			return [];
		}
	})();

	// Create table of contents with title page, modules, and additional sections
	const tocItems = [
		// Title page (always first)
		{ id: 'title-page', text: t('titlePage'), level: 1, type: 'page' as const },
		// Modules
		...modules.map((module) => ({
			id: module.id,
			text: module.title,
			level: 1,
			type: 'module' as const,
		})),
		// Signature is only shown in PDF, not in web view
		// Remove from navigation since it's not rendered on the page
		// Additional sections
		...(data?.certificate
			? [
					{
						id: 'certificate',
						text: data.certificate.name,
						level: 1,
						type: 'section' as const,
					},
				]
			: []),
		...(data?.qualification
			? [
					{
						id: 'qualification',
						text: data.qualification.name,
						level: 1,
						type: 'section' as const,
					},
				]
			: []),
		...(data?.attachment
			? [
					{
						id: 'attachment',
						text: data.attachment.name,
						level: 1,
						type: 'section' as const,
					},
				]
			: []),
	];

	const handleItemClick = (item: (typeof tocItems)[0]) => {
		if (item.type === 'page') {
			// Scroll to title page (module index 0)
			scrollToModule(0);
		} else if (item.type === 'module') {
			// Find module index and scroll to it
			const moduleIndex = modules.findIndex((m) => m.id === item.id);
			if (moduleIndex !== -1) {
				scrollToModule(moduleIndex + 1);
			}
		} else if (item.type === 'section') {
			// Calculate index for signature and additional sections
			let sectionIndex = modules.length + 1; // Start after modules

			// Signature page position
			const hasSignature = !data?.proposal?.online_signature;
			if (item.id === 'signature') {
				scrollToModule(sectionIndex);
				return;
			}

			// Offset by signature if present
			if (hasSignature) sectionIndex += 1;

			if (item.id === 'certificate') {
				scrollToModule(sectionIndex);
			} else if (item.id === 'qualification') {
				sectionIndex += data?.certificate ? 1 : 0;
				scrollToModule(sectionIndex);
			} else if (item.id === 'attachment') {
				sectionIndex += data?.certificate ? 1 : 0;
				sectionIndex += data?.qualification ? 1 : 0;
				scrollToModule(sectionIndex);
			}
		}
	};

	return (
		<div className="py-4">
			<div className="px-4 pb-2 font-medium">{t('tableOfContents')}</div>
			<div className="flex flex-col">
				{tocItems.map((item) => (
					<button
						key={item.id}
						onClick={() => handleItemClick(item)}
						className="text-left px-4 py-2 hover:bg-muted/50 text-sm transition-colors"
						style={{
							paddingLeft: Math.max(16, item.level * 12),
							fontWeight: '400',
							color: 'rgb(15 23 42)',
						}}
					>
						{item.text}
					</button>
				))}
				{tocItems.length === 0 && (
					<div className="px-4 py-2 text-sm text-muted-foreground">{t('noContentFound')}</div>
				)}
			</div>
		</div>
	);
}
