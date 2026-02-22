import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditQualificationClient } from './edit-qualification-client';

interface EditQualificationPageProps {
	params: {
		id: string;
	};
}

export default async function EditQualificationPage({ params }: EditQualificationPageProps) {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	const { id } = await params;

	return (
		<EditQualificationClient qualificationId={id} organisationId={membership.organisation_id} />
	);
}
