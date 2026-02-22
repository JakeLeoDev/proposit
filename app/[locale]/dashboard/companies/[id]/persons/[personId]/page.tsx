import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditPersonClient } from './edit-person-client';

interface EditPersonPageProps {
	params: {
		id: string; // company id
		personId: string;
	};
}

export default async function EditPersonPage({ params }: EditPersonPageProps) {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return (
		<EditPersonClient
			personId={params.personId}
			companyId={params.id}
			organisationId={membership.organisation_id}
		/>
	);
}
