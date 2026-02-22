import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface AuthWrapperProps {
	children: React.ReactNode;
}

export default async function AuthWrapper({ children }: AuthWrapperProps) {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return <div data-organisation-id={membership.organisation_id}>{children}</div>;
}
