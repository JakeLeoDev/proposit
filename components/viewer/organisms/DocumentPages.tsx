'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useDocument } from '@/components/viewer/contexts/DocumentContext';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import TitlePage from '@/components/viewer/organisms/TitlePage';
import { RichTextViewer } from '@/components/editor/rich-text-viewer';
import { cn } from '@/lib/utils';
import DocumentSinglePage from '@/components/viewer/organisms/DocumentSinglePage';
import { createSectionsConfig, getVisibleSections } from '@/lib/proposal-sections-config';
import type { ProposalRelations } from '@/components/viewer/contexts/ProposalContext';

interface DocumentPagesProps {
	scrollContainer: RefObject<HTMLDivElement | null>;
	singlePage?: boolean;
}

interface ContentModule {
	id: string;
	title: string;
	level: number;
	content: any;
}

// Lexical type guards and helpers
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

function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

function getNodePlainText(node: LexicalNode): string {
	if (!node) return '';
	if (node.type === 'text') return node.text ?? '';
	if (Array.isArray(node.children)) {
		return node.children.map(getNodePlainText).join('');
	}
	return '';
}

function buildLexicalFromSubset(
	original: LexicalState,
	childrenSubset: LexicalNode[]
): LexicalState {
	const next = deepClone(original);
	next.root = {
		...next.root,
		type: 'root',
		children: deepClone(childrenSubset),
	};
	return next;
}

function createBasicLexicalState(): LexicalState {
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

function createHeadingNode(text: string, tag: 'h1' | 'h2' = 'h1'): LexicalNode {
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

function createParagraphNode(text: string): LexicalNode {
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

function injectTitleAndDescription(
	content: unknown,
	name: string,
	description?: string
): LexicalState {
	const nodes: LexicalNode[] = [];
	nodes.push(createHeadingNode(name, 'h1'));
	if (description && description.trim().length > 0) {
		nodes.push(createParagraphNode(description));
	}

	let existingContent: LexicalState | null = null;
	try {
		if (content) {
			if (typeof content === 'string') {
				const parsed = JSON.parse(content);
				if (isLexicalState(parsed)) {
					existingContent = parsed;
				}
			} else if (typeof content === 'object' && content !== null) {
				if (isLexicalState(content)) {
					existingContent = content as LexicalState;
				} else {
					const stringified = JSON.stringify(content);
					const parsed = JSON.parse(stringified);
					if (isLexicalState(parsed)) {
						existingContent = parsed;
					}
				}
			}
		}
	} catch {}

	if (existingContent?.root?.children && existingContent.root.children.length > 0) {
		const cleanedNodes = existingContent.root.children.map((node: any) => {
			if (node.type === 'paragraph') {
				const { textFormat: _textFormat, textStyle: _textStyle, ...cleanNode } = node;
				return cleanNode;
			}
			return node;
		});
		nodes.push(...cleanedNodes);
	}

	const baseState = existingContent || createBasicLexicalState();
	const finalState = {
		...baseState,
		root: {
			...baseState.root,
			children: nodes,
		},
	};

	return finalState;
}

function splitLexicalByH1(content: LexicalState): ContentModule[] {
	const children = content.root.children ?? [];

	const modules: ContentModule[] = [];
	let currentTitle: string = '';
	let currentChunk: LexicalNode[] = [];
	let moduleCount = 0;

	const flushModule = () => {
		if (currentChunk.length === 0 && currentTitle === '') return;
		moduleCount += 1;
		const editorState = buildLexicalFromSubset(content, currentChunk);
		modules.push({
			id: `module-${moduleCount}`,
			title: currentTitle,
			level: 1,
			content: editorState,
		});
		currentTitle = '';
		currentChunk = [];
	};

	for (const node of children) {
		if (node?.type === 'heading' && node?.tag === 'h1') {
			flushModule();
			currentTitle = getNodePlainText(node) || '';
			currentChunk = [];
			currentChunk.push(node);
		} else {
			currentChunk.push(node);
		}
	}

	flushModule();
	return modules;
}

// Common section wrapper
const SectionWrapper = ({
	children,
	singlePage,
}: {
	children: React.ReactNode;
	singlePage: boolean;
}) => (
	<div
		className={cn(
			'relative w-[800px] bg-[#FFFFFF]',
			singlePage ? 'drop-shadow-none' : 'drop-shadow-3xl',
			!singlePage && 'page'
		)}
	>
		<div className={cn(!singlePage && 'pt-16 pl-12 pr-12 pb-12 print:p-0')}>{children}</div>
	</div>
);

export default function DocumentPages({ scrollContainer, singlePage = false }: DocumentPagesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
	const { setActiveModuleIndex, registerScrollToModule, registerScrollToSection } = useDocument();
	const { data } = useProposalContext();

	// Parse base proposal content into modules for web view
	const modules: ContentModule[] = (() => {
		try {
			if (!data?.proposal?.content) return [];

			// Check if content is already an object or needs parsing
			let raw: any;
			if (typeof data.proposal.content === 'string') {
				raw = JSON.parse(data.proposal.content as string);
			} else {
				raw = data.proposal.content;
			}

			if (isLexicalState(raw)) {
				const split = splitLexicalByH1(raw);
				return split;
			}
			return [];
		} catch (error) {
			console.error('Error parsing proposal content:', error);
			return [];
		}
	})();

	useEffect(() => {
		if (singlePage) return;

		const scroller = scrollContainer.current;
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const index = pageRefs.current.findIndex((el) => el === entry.target);
						setActiveModuleIndex(index);
					}
				});
			},
			{ root: scroller ?? undefined, threshold: 0.5 }
		);

		pageRefs.current.forEach((el) => el && observer.observe(el));
		return () => observer.disconnect();
	}, [scrollContainer, setActiveModuleIndex, modules.length, singlePage]);

	useEffect(() => {
		if (singlePage) return;

		registerScrollToModule((index) => {
			const target = pageRefs.current[index];
			const scroller = scrollContainer.current;
			if (target && scroller) {
				const top = target.getBoundingClientRect().top + scroller.scrollTop - window.innerHeight * 0.1;
				scroller.scrollTo({ top, behavior: 'smooth' });
			}
		});

		registerScrollToSection((id) => {
			const scroller = scrollContainer.current;
			const root = containerRef.current;
			if (!scroller || !root) return;
			const el = root.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
			if (el) {
				const top = el.getBoundingClientRect().top + scroller.scrollTop - window.innerHeight * 0.1;
				scroller.scrollTo({ top, behavior: 'smooth' });
			}
		});
	}, [registerScrollToModule, registerScrollToSection, scrollContainer, singlePage]);

	if (singlePage) {
		return <DocumentSinglePage />;
	}

	if (!data) return null;

	// Create render functions for web view sections
	const renderTitle = (_data: ProposalRelations) => (
		<div
			ref={(el) => {
				pageRefs.current[0] = el;
			}}
		>
			<TitlePage disablePageClass={singlePage} hideFooter={singlePage} />
		</div>
	);

	const renderToc = () => <></>; // TOC not shown in web view

	const renderContent = (data: ProposalRelations, proposalId?: string) => {
		if (modules.length === 0) return null;
		return (
			<div className="flex flex-col gap-y-8">
				{modules.map((module, moduleIndex) => (
					<div
						key={module.id}
						ref={(el) => {
							pageRefs.current[moduleIndex + 1] = el;
						}}
					>
						<SectionWrapper singlePage={singlePage}>
							{module.content && (
								<div className="mb-6">
									<div className="prose max-w-none text-neutral-700 leading-relaxed">
										<RichTextViewer value={JSON.stringify(module.content)} proposalId={proposalId} />
									</div>
								</div>
							)}
							{!singlePage && data?.organisation?.footer && (
								<div className="mt-8 pt-4 border-t">
									<div className="text-xs text-neutral-500 text-center">{data.organisation.footer}</div>
								</div>
							)}
						</SectionWrapper>
					</div>
				))}
			</div>
		);
	};

	const renderSignature = () => <></>; // Signature not shown in web view

	const renderCertificate = (data: ProposalRelations, proposalId?: string) => {
		if (!data.certificate) return null;
		const signatureOffset = !data?.proposal?.online_signature ? 1 : 0;
		return (
			<div
				ref={(el) => {
					pageRefs.current[modules.length + 1 + signatureOffset] = el;
				}}
			>
				<SectionWrapper singlePage={singlePage}>
					<RichTextViewer
						value={JSON.stringify(
							injectTitleAndDescription(
								data.certificate.content,
								data.certificate.name,
								data.certificate.description
							)
						)}
						proposalId={proposalId}
						minHeight="auto"
					/>
					{!singlePage && data?.organisation?.footer && (
						<div className="mt-8 pt-4 border-t">
							<div className="text-xs text-neutral-500 text-center">{data.organisation.footer}</div>
						</div>
					)}
				</SectionWrapper>
			</div>
		);
	};

	const renderQualification = (data: ProposalRelations, proposalId?: string) => {
		if (!data.qualification) return null;
		const signatureOffset = !data?.proposal?.online_signature ? 1 : 0;
		return (
			<div
				ref={(el) => {
					pageRefs.current[modules.length + 1 + signatureOffset + (data?.certificate ? 1 : 0)] = el;
				}}
			>
				<SectionWrapper singlePage={singlePage}>
					<RichTextViewer
						value={JSON.stringify(
							injectTitleAndDescription(
								data.qualification.content,
								data.qualification.name,
								data.qualification.description
							)
						)}
						proposalId={proposalId}
						minHeight="auto"
					/>
					{!singlePage && data?.organisation?.footer && (
						<div className="mt-8 pt-4 border-t">
							<div className="text-xs text-neutral-500 text-center">{data.organisation.footer}</div>
						</div>
					)}
				</SectionWrapper>
			</div>
		);
	};

	const renderAttachment = (data: ProposalRelations, proposalId?: string) => {
		if (!data.attachment) return null;
		const signatureOffset = !data?.proposal?.online_signature ? 1 : 0;
		const offset =
			modules.length +
			1 +
			signatureOffset +
			(data?.certificate ? 1 : 0) +
			(data?.qualification ? 1 : 0);
		return (
			<div
				ref={(el) => {
					pageRefs.current[offset] = el;
				}}
			>
				<SectionWrapper singlePage={singlePage}>
					<RichTextViewer
						value={JSON.stringify(
							injectTitleAndDescription(
								data.attachment.content,
								data.attachment.name,
								data.attachment.description
							)
						)}
						proposalId={proposalId}
						minHeight="auto"
					/>
					{!singlePage && data?.organisation?.footer && (
						<div className="mt-8 pt-4 border-t">
							<div className="text-xs text-neutral-500 text-center">{data.organisation.footer}</div>
						</div>
					)}
				</SectionWrapper>
			</div>
		);
	};

	// Create sections configuration
	const sections = createSectionsConfig(
		renderTitle,
		renderToc,
		renderContent,
		renderSignature,
		renderCertificate,
		renderQualification,
		renderAttachment
	);

	// Get visible sections for web view
	const visibleSections = getVisibleSections(sections, data, 'web');
	console.log('visibleSections', visibleSections);
	return (
		<div ref={containerRef} className={cn('w-[800px]')}>
			<div
				className={cn(
					'flex h-auto text-black flex-col items-center',
					singlePage ? 'gap-y-4 pb-0' : 'gap-y-8 pb-16'
				)}
			>
				{visibleSections.map((section) => (
					<div key={section.id}>{section.renderFunction(data, data.proposal?.id)}</div>
				))}
			</div>
		</div>
	);
}
