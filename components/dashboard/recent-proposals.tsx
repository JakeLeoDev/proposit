import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/viewer/atoms/StatusBadge';
import { formatDate } from '@/lib/utils';
import type { Proposal } from '@/lib/types';
import { Plus, FileText, Eye } from 'lucide-react';

interface RecentProposalsProps {
	organizationId: string;
}

async function getRecentProposals(organizationId: string): Promise<Proposal[]> {
	const supabase = await createClient();

	const { data: proposals, error } = await supabase
		.from('proposals')
		.select('*')
		.eq('organisation_id', organizationId)
		.order('created_at', { ascending: false })
		.limit(5);

	if (error) {
		console.error('Error fetching proposals:', error);
		return [];
	}

	return proposals || [];
}

export async function RecentProposals({ organizationId }: RecentProposalsProps) {
	const proposals = await getRecentProposals(organizationId);
	const t = await getTranslations('dashboard');

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5" />
					{t('recentProposals')}
				</CardTitle>
				<Button asChild size="sm">
					<Link href="/dashboard/proposals/new">
						<Plus className="h-4 w-4 mr-2" />
						{t('createProposal')}
					</Link>
				</Button>
			</CardHeader>
			<CardContent>
				{proposals.length === 0 ? (
					<div className="text-center py-8 space-y-4">
						<div className="space-y-2">
							<FileText className="h-12 w-12 mx-auto text-muted-foreground" />
							<h3 className="text-lg font-semibold">{t('noProposalsYet')}</h3>
							<p className="text-muted-foreground">{t('createFirstProposalDescription')}</p>
						</div>
						<Button asChild>
							<Link href="/dashboard/proposals/new">
								<Plus className="h-4 w-4 mr-2" />
								{t('createFirstProposal')}
							</Link>
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						{proposals.map((proposal) => (
							<div
								key={proposal.id}
								className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div className="flex-1 space-y-1">
									<div className="flex items-center gap-2">
										<Link
											href={`/dashboard/proposals/${proposal.id}`}
											className="font-medium hover:underline"
										>
											{proposal.name}
										</Link>
										<StatusBadge status={proposal.status} />
									</div>
									<p className="text-sm text-muted-foreground">{formatDate(proposal.created_at)}</p>
								</div>
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" asChild>
										<Link href={`/dashboard/proposals/${proposal.id}`}>
											<Eye className="h-4 w-4 mr-1" />
											{t('view')}
										</Link>
									</Button>
								</div>
							</div>
						))}

						{proposals.length >= 5 && (
							<div className="pt-4 border-t">
								<Button variant="outline" asChild className="w-full">
									<Link href="/dashboard/proposals">{t('viewAllProposals')}</Link>
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
