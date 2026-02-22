import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import type { Organisation, User } from '@/lib/types';

interface DashboardWelcomeProps {
	organization: Organisation;
}

async function getUserProfile(): Promise<User | null> {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return null;
	}

	const { data: profile, error } = await supabase
		.from('users')
		.select('*')
		.eq('id', user.id)
		.single();

	if (error) {
		return null;
	}

	return profile;
}

async function getProposalStats(organizationId: string) {
	const supabase = await createClient();

	const [totalRes, draftsRes, publishedRes] = await Promise.all([
		supabase
			.from('proposals')
			.select('*', { count: 'exact', head: true })
			.eq('organisation_id', organizationId),
		supabase
			.from('proposals')
			.select('*', { count: 'exact', head: true })
			.eq('organisation_id', organizationId)
			.eq('status', 'Draft'),
		supabase
			.from('proposals')
			.select('*', { count: 'exact', head: true })
			.eq('organisation_id', organizationId)
			.not('status', 'eq', 'Draft'),
	]);

	if (totalRes.error || draftsRes.error || publishedRes.error) {
		return { total: 0, drafts: 0, published: 0 };
	}

	return {
		total: totalRes.count ?? 0,
		drafts: draftsRes.count ?? 0,
		published: publishedRes.count ?? 0,
	};
}

export async function DashboardWelcome({ organization }: DashboardWelcomeProps) {
	const t = await getTranslations('dashboard');
	const stats = await getProposalStats(organization.id);
	const user = await getUserProfile();

	// Determine display name
	const displayName =
		user?.display_name ||
		(user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null) ||
		t('user');

	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="text-left space-y-4 pby-8">
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">
						{t('welcomeBack')}, {displayName}!
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl">{t('overviewDescription')}</p>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('totalProposals')}</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
						<p className="text-xs text-muted-foreground">{t('allProposals')}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('draftProposals')}</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.drafts}</div>
						<p className="text-xs text-muted-foreground">{t('inProgress')}</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t('publishedProposals')}</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.published}</div>
						<p className="text-xs text-muted-foreground">{t('published')}</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
