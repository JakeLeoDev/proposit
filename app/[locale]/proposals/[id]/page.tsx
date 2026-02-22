import { ProposalViewLayout } from '@/components/viewer/templates/ProposalViewLayout';
import DocumentViewClient from '@/components/viewer/templates/DocumentViewClient';

interface Props {
	params: Promise<{ id: string; locale: string }>;
	searchParams: Promise<{ preview?: string; token?: string; canvas?: string }>;
}

export default async function ProposalPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { preview, token, canvas } = await searchParams;

	return (
		<ProposalViewLayout
			proposalId={id}
			preview={preview}
			token={token}
			showPreviewBanner={true}
			canvas={canvas === 'true'}
		>
			<DocumentViewClient canvas={canvas === 'true'} />
		</ProposalViewLayout>
	);
}
