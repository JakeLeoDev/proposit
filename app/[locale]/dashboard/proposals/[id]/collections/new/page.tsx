import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewProposalCollectionClient } from './new-proposal-collection-client';

export default async function NewProposalCollectionPage({ params }: { params: { id: string } }) {
	const membership = await getUserOrganisation();
	if (!membership) {
		redirect('/auth/login');
	}

	return (
		<NewProposalCollectionClient organisationId={membership.organisation_id} proposalId={params.id} />
	);
}
