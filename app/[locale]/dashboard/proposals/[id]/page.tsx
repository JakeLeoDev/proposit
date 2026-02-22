import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditProposalClient } from './edit-proposal-client';
import { isEmailConfigured } from '@/lib/email-service';

interface Props {
	params: Promise<{ id: string }>;
}

export default async function EditProposalPage({ params }: Props) {
	const membership = await getUserOrganisation();
	if (!membership) {
		redirect('/auth/login');
	}
	const { id } = await params;
	const aiFeatureEnabled = membership.organisations.ai_feature || false;
	return (
		<EditProposalClient
			proposalId={id}
			aiFeatureEnabled={aiFeatureEnabled}
			emailEnabled={isEmailConfigured()}
		/>
	);
}
