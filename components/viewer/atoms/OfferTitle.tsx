'use client';

import { getProposalTitle, useProposalContext } from '@/components/viewer/contexts/ProposalContext';

export default function OfferTitle() {
	const { data } = useProposalContext();
	return (
		<div className="p-4 border-b">
			<h2 className="text-lg font-semibold italic">{getProposalTitle(data || null)}</h2>
		</div>
	);
}
