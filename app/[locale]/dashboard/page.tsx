import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardWelcome } from '@/components/dashboard/dashboard-welcome';
import { RecentProposals } from '@/components/dashboard/recent-proposals';

export default async function DashboardPage() {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	return (
		<div className="container mx-auto px-6 pb-8">
			<div className="space-y-8">
				<DashboardWelcome organization={membership.organisations!} />
				<RecentProposals organizationId={membership.organisation_id} />
			</div>
		</div>
	);
}
