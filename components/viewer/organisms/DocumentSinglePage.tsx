'use client';

import { Fragment } from 'react';
import TitlePage from '@/components/viewer/organisms/TitlePage';
import SignaturePage from '@/components/viewer/organisms/SignaturePage';
// import TableOfContents from '@/components/viewer/organisms/TableOfContents';
import A4Page from '@/components/viewer/organisms/A4Page';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { RichTextViewer } from '@/components/editor/rich-text-viewer';
import { createSectionsConfig, getVisibleSections } from '@/lib/proposal-sections-config';
import { parseToLexicalState, injectTitleAndDescription } from '@/lib/pdf-pagination';
import type { ProposalRelations } from '@/components/viewer/contexts/ProposalContext';
import type { LexicalState } from '@/lib/pdf-pagination';

export default function DocumentSinglePage() {
	const { data } = useProposalContext();

	if (!data) return null;

	// Parse base proposal content
	const baseState: LexicalState | null = parseToLexicalState(data.proposal?.content);

	// Organisation footer
	const organisationFooter = data.organisation?.footer || undefined;

	// Page counter - starts at 0 for title page
	let currentPageNumber = 0;

	// Create render functions for sections
	// Each section returns a page or array of pages

	const renderTitle = (_data: ProposalRelations) => {
		// Title page: no page number, no footer
		return (
			<A4Page key="title-page" showFooter={false}>
				<TitlePage disablePageClass hideFooter />
			</A4Page>
		);
	};

	// Temporary renderToc - will be replaced after sections are created
	// TOC disabled
	const tempRenderToc = (_data: ProposalRelations) => <></>;

	const renderContent = (_data: ProposalRelations, proposalId?: string) => {
		if (!baseState) return null;

		// Render all content at once in auto-paginated wrapper - CSS will handle pagination
		currentPageNumber++;
		return (
			<div className="auto-paginated-page" key="content-pages">
				<div className="auto-paginated-content">
					<div className="prose max-w-none text-neutral-700 leading-relaxed break-words">
						<RichTextViewer value={JSON.stringify(baseState)} proposalId={proposalId} />
					</div>
				</div>
				{/* Footer removed */}
			</div>
		);
	};

	const renderSignature = (_data: ProposalRelations) => {
		currentPageNumber++;

		return (
			<A4Page
				key={`signature-page-${currentPageNumber}`}
				pageNumber={currentPageNumber}
				footer={organisationFooter}
				showFooter={false}
			>
				<SignaturePage hideFooter />
			</A4Page>
		);
	};

	const renderCertificate = (data: ProposalRelations, proposalId?: string) => {
		if (!data.certificate) return null;

		const certificateContent = injectTitleAndDescription(
			data.certificate.content,
			data.certificate.name,
			data.certificate.description
		);

		// Render all content at once in auto-paginated wrapper - CSS will handle pagination
		currentPageNumber++;
		return (
			<div className="auto-paginated-page" key={`certificate-pages-${data.certificate.id}`}>
				<div className="auto-paginated-content">
					<div className="prose max-w-none text-neutral-700 leading-relaxed break-words">
						<RichTextViewer
							value={JSON.stringify(certificateContent)}
							proposalId={proposalId}
							minHeight="auto"
						/>
					</div>
				</div>
				{/* Footer removed */}
			</div>
		);
	};

	const renderQualification = (data: ProposalRelations, proposalId?: string) => {
		if (!data.qualification) return null;

		const qualificationContent = injectTitleAndDescription(
			data.qualification.content,
			data.qualification.name,
			data.qualification.description
		);

		// Render all content at once in auto-paginated wrapper - CSS will handle pagination
		currentPageNumber++;
		return (
			<div className="auto-paginated-page" key={`qualification-pages-${data.qualification.id}`}>
				<div className="auto-paginated-content">
					<div className="prose max-w-none text-neutral-700 leading-relaxed break-words">
						<RichTextViewer
							value={JSON.stringify(qualificationContent)}
							proposalId={proposalId}
							minHeight="auto"
						/>
					</div>
				</div>
				{/* Footer removed */}
			</div>
		);
	};

	const renderAttachment = (data: ProposalRelations, proposalId?: string) => {
		if (!data.attachment) return null;

		const attachmentContent = injectTitleAndDescription(
			data.attachment.content,
			data.attachment.name,
			data.attachment.description
		);

		// Render all content at once in auto-paginated wrapper - CSS will handle pagination
		currentPageNumber++;
		return (
			<div className="auto-paginated-page" key={`attachment-pages-${data.attachment.id}`}>
				<div className="auto-paginated-content">
					<div className="prose max-w-none text-neutral-700 leading-relaxed break-words">
						<RichTextViewer
							value={JSON.stringify(attachmentContent)}
							proposalId={proposalId}
							minHeight="auto"
						/>
					</div>
				</div>
				{/* Footer removed */}
			</div>
		);
	};

	// Create sections configuration
	const sections = createSectionsConfig(
		renderTitle,
		tempRenderToc,
		renderContent,
		renderSignature,
		renderCertificate,
		renderQualification,
		renderAttachment
	);

	// TOC disabled: page count estimation not needed

	// Now create the real renderToc that has access to sections
	// Calculate page numbers by simulating the page count
	// Disable TOC rendering entirely
	const renderToc = (_data: ProposalRelations) => null;

	// Update the TOC section's renderFunction
	const tocSection = sections.find((s) => s.id === 'toc');
	if (tocSection) {
		tocSection.renderFunction = renderToc;
	}

	// Reset page counter for actual rendering
	currentPageNumber = 0;

	// Get visible sections for PDF
	const visibleSections = getVisibleSections(sections, data, 'pdf').filter((s) => s.id !== 'toc');

	return (
		<div className="flex flex-col">
			{visibleSections.map((section) => {
				const element = section.renderFunction(data, data.proposal?.id);
				return element ? <Fragment key={section.id}>{element}</Fragment> : null;
			})}
		</div>
	);
}
