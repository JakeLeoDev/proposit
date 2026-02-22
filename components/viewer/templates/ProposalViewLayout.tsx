import type { ReactNode } from 'react';
import { loadProposalPageData } from '@/lib/proposals-server-utils';
import { ProposalProvider } from '@/components/viewer/contexts/ProposalContext';
import { PreviewBanner } from '@/components/viewer/PreviewBanner';

interface ProposalViewLayoutProps {
	proposalId: string;
	preview?: string;
	token?: string;
	children: ReactNode;
	showPreviewBanner?: boolean;
	wrapperClassName?: string;
	skipWrapper?: boolean;
	canvas?: boolean;
}

/**
 * Shared layout component for proposal viewing pages
 * Handles data loading, access control, and provides common structure
 */
export async function ProposalViewLayout({
	proposalId,
	preview,
	token,
	children,
	showPreviewBanner = true,
	wrapperClassName,
	skipWrapper = false,
	canvas,
}: ProposalViewLayoutProps) {
	const {
		proposalData,
		token: accessToken,
		isActualPreview,
	} = await loadProposalPageData(proposalId, preview, token);

	const content = (
		<>
			{showPreviewBanner && isActualPreview && !canvas && <PreviewBanner />}
			{skipWrapper ? (
				<ProposalProvider initialData={proposalData} token={accessToken}>
					{children}
				</ProposalProvider>
			) : (
				<main className="flex-1 overflow-auto">
					<ProposalProvider initialData={proposalData} token={accessToken}>
						{children}
					</ProposalProvider>
				</main>
			)}
		</>
	);

	if (skipWrapper) {
		return content;
	}

	return <div className={wrapperClassName || 'h-full bg-background flex flex-col'}>{content}</div>;
}
