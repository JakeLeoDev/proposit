'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Home,
	FileText,
	ChevronLeft,
	ChevronRight,
	GraduationCap,
	Award,
	Package,
	Tag,
	Building2,
	Paperclip,
	Bot,
	Sparkles,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { OrganisationUserWithOrganisation } from '@/lib/types';

const getSidebarItems = (aiFeatureEnabled: boolean) => [
	{
		label: 'dashboard',
		href: '/dashboard',
		icon: Home,
	},
	{
		label: 'proposals',
		href: '/dashboard/proposals',
		icon: FileText,
	},
	{
		label: 'companies',
		href: '/dashboard/companies',
		icon: Building2,
	},
	{
		label: 'qualifications',
		href: '/dashboard/qualifications',
		icon: GraduationCap,
	},
	{
		label: 'certificates',
		href: '/dashboard/certificates',
		icon: Award,
	},
	{
		label: 'products',
		href: '/dashboard/products',
		icon: Package,
	},
	{
		label: 'categories',
		href: '/dashboard/categories',
		icon: Tag,
	},
	{
		label: 'attachments',
		href: '/dashboard/attachments',
		icon: Paperclip,
	},
	...(aiFeatureEnabled
		? [
				{
					label: 'aiAssistant',
					href: '/dashboard/ai-assistant',
					icon: Bot,
				},
			]
		: []),
];

export function DashboardSidebar({ membership }: { membership: OrganisationUserWithOrganisation }) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const pathname = usePathname();
	const t = useTranslations('navigation');
	const locale = useLocale();

	const aiFeatureEnabled = membership.organisations.ai_feature;
	const sidebarItems = getSidebarItems(aiFeatureEnabled);

	return (
		<aside
			className={cn(
				'border-r bg-muted/30 flex-shrink-0 transition-all duration-300 relative flex flex-col',
				isCollapsed ? 'w-16' : 'w-64'
			)}
		>
			<nav className="flex-1 space-y-2 p-3 flex flex-col pb-16">
				{sidebarItems.map((item, index) => {
					const Icon = item.icon;
					const isActive = pathname === item.href;

					// Add separator after dashboard (index 0)
					const showSeparatorAfterDashboard = index === 0;
					// Add separator after attachments (index 7)
					const showSeparatorAfterAttachments = index === 7;

					return (
						<div key={item.href} className="flex flex-col">
							<Link href={item.href}>
								<Button
									variant="ghost"
									className={cn(
										'w-full justify-start relative h-10 cursor-pointer',
										isActive &&
											'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
										isCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
									)}
									title={isCollapsed ? t(item.label as string) : undefined}
								>
									{isActive && (
										<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
									)}
									<Icon size={16} className={cn('mr-2', isCollapsed && 'mr-0')} />
									{!isCollapsed && t(item.label as string)}
								</Button>
							</Link>

							{/* Separator after dashboard */}
							{showSeparatorAfterDashboard && <Separator className="my-2" />}

							{/* Separator after attachments */}
							{showSeparatorAfterAttachments && <Separator className="my-2" />}
						</div>
					);
				})}

				{!isCollapsed && (
					<div className="mt-auto">
						<Link href={`/${locale}/dashboard/settings/user`}>
							<div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between gap-2 cursor-pointer">
								<div className="flex items-center gap-2">
									<Sparkles size={16} className="text-primary flex-shrink-0" />
									<div>
										<div className="font-medium">{t('mcpAnnouncement')}</div>
										<div className="text-muted-foreground">{t('mcpAnnouncementSub')}</div>
									</div>
								</div>
								<ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
							</div>
						</Link>
					</div>
				)}
			</nav>

			<Button
				variant="ghost"
				size="sm"
				onClick={() => setIsCollapsed(!isCollapsed)}
				className={cn(
					'absolute bottom-4 h-10 w-10 p-0 cursor-pointer',
					isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-2'
				)}
			>
				{isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
			</Button>
		</aside>
	);
}
