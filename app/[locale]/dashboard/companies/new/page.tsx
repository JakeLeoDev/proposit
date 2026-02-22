import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewCompanyClient } from './new-company-client';

export default async function NewCompanyPage() {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return <NewCompanyClient organisationId={membership.organisation_id} />;
}
