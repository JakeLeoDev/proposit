'use client';

import { useTranslations } from 'next-intl';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

export default function LogoBox() {
	const t = useTranslations('viewer');
	const { data, token } = useProposalContext();
	const orgName = data?.organisation?.name || t('organisation');
	const orgLogo = data?.organisation?.logo;

	const proposalId = data?.proposal.id;

	// Return null if no logo exists
	if (!orgLogo) {
		return null;
	}

	// In view mode, use server-side API for image loading
	if (proposalId && orgLogo) {
		let serverImageSrc = `/api/proposals/${proposalId}/images/${orgLogo}`;
		if (token) {
			serverImageSrc += `?token=${encodeURIComponent(token)}`;
		}
		return (
			<div className="p-4 border-b w-full flex items-center justify-center">
				<img
					src={serverImageSrc}
					alt={`${orgName} Logo`}
					width={200}
					height={60}
					className="h-auto object-contain m-2"
				/>
			</div>
		);
	}

	// Fallback to authenticated image component (for edit mode or when no proposal ID)
	return (
		<div className="p-4 border-b w-full flex items-center justify-center">
			<AuthenticatedImage
				src={`Media/${orgLogo}`}
				alt={`${orgName} Logo`}
				width={200}
				height={60}
				className="h-auto object-contain m-2"
			/>
		</div>
	);
}
