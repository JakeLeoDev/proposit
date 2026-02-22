import { ProposalViewLayout } from '@/components/viewer/templates/ProposalViewLayout';
import DocumentPdfViewClient from '@/components/viewer/templates/DocumentPdfViewClient';

interface Props {
	params: Promise<{ id: string; locale: string }>;
	searchParams: Promise<{ preview?: string; token?: string }>;
}

export default async function ProposalPdfPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { preview, token } = await searchParams;

	return (
		<ProposalViewLayout
			proposalId={id}
			preview={preview}
			token={token}
			showPreviewBanner={false}
			skipWrapper={true}
		>
			<DocumentPdfViewClient />
		</ProposalViewLayout>
	);
}
