import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditProposalCollectionClient } from './edit-proposal-collection-client';

export default async function EditProposalCollectionPage({
	params,
}: {
	params: { id: string; collectionId: string };
}) {
	const membership = await getUserOrganisation();
	if (!membership) {
		redirect('/auth/login');
	}
	return (
		<EditProposalCollectionClient
			organisationId={membership.organisation_id}
			proposalId={params.id}
			collectionId={params.collectionId}
		/>
	);
}
