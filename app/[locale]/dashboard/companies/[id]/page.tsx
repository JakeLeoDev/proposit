import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditCompanyClient } from './edit-company-client';

interface EditCompanyPageProps {
	params: {
		id: string;
	};
}

export default async function EditCompanyPage({ params }: EditCompanyPageProps) {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return <EditCompanyClient companyId={params.id} organisationId={membership.organisation_id} />;
}
