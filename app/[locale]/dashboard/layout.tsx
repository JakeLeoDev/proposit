import { getUser, getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayoutClient } from './layout-client';

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	// First check if user is authenticated
	const user = await getUser();

	if (!user) {
		// Not authenticated - redirect to login
		redirect(`/${locale}/auth/login`);
	}

	// User is authenticated - check if they have an organisation
	const membership = await getUserOrganisation();

	if (!membership) {
		// Authenticated but no organisation - redirect to create organisation
		redirect(`/${locale}/auth/create-organisation`);
	}

	return <DashboardLayoutClient membership={membership}>{children}</DashboardLayoutClient>;
}
