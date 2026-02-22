import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EditProductCollectionClient } from './edit-product-collection-client';

interface PageProps {
	params: { id: string };
}

export default async function EditProductCollectionPage({ params }: PageProps) {
	const { id } = params;
	const membership = await getUserOrganisation();
	if (!membership) {
		redirect('/auth/login');
	}
	return (
		<EditProductCollectionClient collectionId={id} organisationId={membership.organisation_id} />
	);
}
