import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewCertificateClient } from './new-certificate-client';

export default async function NewCertificatePage() {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return <NewCertificateClient organisationId={membership.organisation_id} />;
}
