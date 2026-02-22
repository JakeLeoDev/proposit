import type { ReactElement } from 'react';
import type { ProposalRelations } from '@/components/viewer/contexts/ProposalContext';

export interface SectionConfig {
	id: string;
	type: 'title' | 'toc' | 'content' | 'signature' | 'certificate' | 'qualification' | 'attachment';
	title: string | ((data: ProposalRelations) => string);
	showInWeb: boolean;
	showInPdf: boolean;
	showInToc: boolean;
	shouldRender?: (data: ProposalRelations) => boolean;
	renderFunction: (data: ProposalRelations, proposalId?: string) => ReactElement | null;
}

// This will be populated with actual render functions in the components
export const createSectionsConfig = (
	renderTitle: (data: ProposalRelations) => ReactElement,
	renderToc: (data: ProposalRelations) => ReactElement,
	renderContent: (data: ProposalRelations, proposalId?: string) => ReactElement | null,
	renderSignature: (data: ProposalRelations) => ReactElement,
	renderCertificate: (data: ProposalRelations, proposalId?: string) => ReactElement | null,
	renderQualification: (data: ProposalRelations, proposalId?: string) => ReactElement | null,
	renderAttachment: (data: ProposalRelations, proposalId?: string) => ReactElement | null
): SectionConfig[] => {
	return [
		{
			id: 'title',
			type: 'title',
			title: 'Titelseite',
			showInWeb: true,
			showInPdf: true,
			showInToc: false,
			renderFunction: renderTitle,
		},
		{
			id: 'toc',
			type: 'toc',
			title: 'Inhaltsverzeichnis',
			showInWeb: false,
			showInPdf: false,
			showInToc: false,
			renderFunction: renderToc,
		},
		{
			id: 'content',
			type: 'content',
			title: 'Angebot',
			showInWeb: true,
			showInPdf: true,
			showInToc: true,
			shouldRender: (data) => !!data.proposal?.content,
			renderFunction: renderContent,
		},
		{
			id: 'signature',
			type: 'signature',
			title: 'Unterschrift',
			showInWeb: false,
			showInPdf: true,
			showInToc: true,
			shouldRender: (data) => !data.proposal?.online_signature,
			renderFunction: renderSignature,
		},
		{
			id: 'certificate',
			type: 'certificate',
			title: (data) => data.certificate?.name || 'Zertifikat',
			showInWeb: true,
			showInPdf: true,
			showInToc: true,
			shouldRender: (data) => !!data.certificate,
			renderFunction: renderCertificate,
		},
		{
			id: 'qualification',
			type: 'qualification',
			title: (data) => data.qualification?.name || 'Qualifikation',
			showInWeb: true,
			showInPdf: true,
			showInToc: true,
			shouldRender: (data) => !!data.qualification,
			renderFunction: renderQualification,
		},
		{
			id: 'attachment',
			type: 'attachment',
			title: (data) => data.attachment?.name || 'Anhang',
			showInWeb: true,
			showInPdf: true,
			showInToc: true,
			shouldRender: (data) => !!data.attachment,
			renderFunction: renderAttachment,
		},
	];
};

// Helper to get sections that should be displayed
export const getVisibleSections = (
	sections: SectionConfig[],
	data: ProposalRelations,
	mode: 'web' | 'pdf'
): SectionConfig[] => {
	return sections.filter((section) => {
		const showInMode = mode === 'web' ? section.showInWeb : section.showInPdf;
		const shouldRender = section.shouldRender ? section.shouldRender(data) : true;
		return showInMode && shouldRender;
	});
};

// Helper to get sections for table of contents
export const getTocSections = (
	allSections: SectionConfig[],
	data: ProposalRelations
): Array<{ id: string; title: string; pageNumber: number }> => {
	if (!Array.isArray(allSections)) {
		return [];
	}

	const visiblePdfSections = getVisibleSections(allSections, data, 'pdf');
	let pageNumber = 1; // Start counting from page 1

	const tocEntries: Array<{ id: string; title: string; pageNumber: number }> = [];

	for (const section of visiblePdfSections) {
		// Count all sections except TOC itself
		if (section.id !== 'toc') {
			pageNumber++;

			if (section.showInToc) {
				const title = typeof section.title === 'function' ? section.title(data) : section.title;
				tocEntries.push({
					id: section.id,
					title,
					pageNumber,
				});
			}
		}
	}

	return tocEntries;
};

// Helper to resolve section title
export const getSectionTitle = (section: SectionConfig, data: ProposalRelations): string => {
	return typeof section.title === 'function' ? section.title(data) : section.title;
};
