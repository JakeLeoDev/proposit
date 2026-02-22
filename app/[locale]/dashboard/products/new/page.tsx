import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewProductCollectionClient } from './new-product-collection-client';

export default async function NewProductCollectionPage() {
	const membership = await getUserOrganisation();
	if (!membership) {
		redirect('/auth/login');
	}
	return <NewProductCollectionClient organisationId={membership.organisation_id} />;
}
