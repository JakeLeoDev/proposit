import { getUserSilently, getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PublicNavbar } from '@/components/navigation/public-navbar';

export default async function AuthLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	// Check if user is already authenticated
	const user = await getUserSilently();

	if (user) {
		// If user is authenticated, check if they have an organisation
		const membership = await getUserOrganisation();
		if (membership) {
			// User is fully set up, redirect to dashboard
			const { locale } = await params;
			redirect(`/${locale}/dashboard`);
		} else {
			// User exists but no organisation - handle this case
			// For now, we'll allow them to stay on auth pages
			// In future, you might want to redirect to an onboarding flow
		}
	}

	const { locale } = await params;

	return (
		<div className="h-full bg-background flex flex-col">
			<PublicNavbar locale={locale} />
			<div className="flex-1 flex items-center justify-center">{children}</div>
		</div>
	);
}
