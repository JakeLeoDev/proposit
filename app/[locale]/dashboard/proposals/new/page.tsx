import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewProposalClient } from './new-proposal-client';

export default async function NewProposalPage() {
	const membership = await getUserOrganisation();
	if (!membership) {
		redirect('/auth/login');
	}
	return (
		<NewProposalClient organisationId={membership.organisation_id} userId={membership.user_id} />
	);
}
