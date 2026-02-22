import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewQualificationClient } from './new-qualification-client';

export default async function NewQualificationPage() {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return <NewQualificationClient organisationId={membership.organisation_id} />;
}
