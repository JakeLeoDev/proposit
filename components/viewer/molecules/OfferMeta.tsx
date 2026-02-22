'use client';

import {
	getValidUntilFormatted,
	useProposalContext,
} from '@/components/viewer/contexts/ProposalContext';

export default function OfferMeta() {
	const { data } = useProposalContext();
	const validUntil = getValidUntilFormatted(data || null);

	// Get contact person name for sidebar display
	const contactPersonName = data?.recipient
		? [data.recipient.title, data.recipient.first_name, data.recipient.last_name]
				.filter(Boolean)
				.join(' ')
				.trim()
		: '—';

	// Get preparator name
	const preparatorName = data?.preparator
		? `${data.preparator.first_name || ''} ${data.preparator.last_name || ''}`.trim() ||
			data.preparator.display_name ||
			'—'
		: '—';

	return (
		<div className="p-4 border-b text-sm text-muted-foreground space-y-1">
			<div>Kontakt: {contactPersonName}</div>
			<div>Absender: {preparatorName}</div>
			{validUntil && <div>Gültig bis: {validUntil}</div>}
		</div>
	);
}
