import { getUser, getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateOrganisationClient } from './create-organisation-client';

export default async function CreateOrganisationPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	// Check if user is authenticated
	const user = await getUser();

	if (!user) {
		// Not authenticated - redirect to login
		redirect(`/${locale}/auth/login`);
	}

	// Check if user already has an organisation
	const membership = await getUserOrganisation();

	if (membership) {
		// User already has an organisation - redirect to dashboard
		redirect(`/${locale}/dashboard`);
	}

	return <CreateOrganisationClient userId={user.id} locale={locale} />;
}
