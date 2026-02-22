'use client';

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { DashboardBreadcrumbs } from '@/components/dashboard/breadcrumbs';
import { Toaster } from 'sonner';
import { usePathname } from 'next/navigation';
import type { OrganisationUserWithOrganisation } from '@/lib/types';

export const DashboardLayoutClient = ({
	children,
	membership,
}: {
	children: React.ReactNode;
	membership: OrganisationUserWithOrganisation;
}) => {
	const pathname = usePathname();

	return (
		<div className="h-full bg-background flex flex-col">
			<DashboardTopbar organization={membership.organisations} />
			<div className="flex flex-1 overflow-hidden">
				<DashboardSidebar membership={membership} />
				<main className="flex-1 overflow-auto">
					{(!pathname.includes('/ai-assistant') || pathname.includes('/ai-assistant/')) && (
						<div className="container mx-auto px-6 pt-6">
							<DashboardBreadcrumbs />
						</div>
					)}
					<div className="flex-0 h-full">{children}</div>
				</main>
			</div>
			<Toaster />
		</div>
	);
};
