'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, History, RotateCcw } from 'lucide-react';
import { proposalVersionsService } from '@/lib/proposal-versions-service';
import { usersService } from '@/lib/users-service';
import type { ProposalVersion, Proposal, User } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface VersionsTabProps {
	proposal: Proposal;
	onProposalUpdate?: (proposal: Proposal) => void;
}

export default function VersionsTab({
	proposal,
	onProposalUpdate: _onProposalUpdate,
}: VersionsTabProps) {
	const t = useTranslations('proposals');
	const tCommon = useTranslations('common');
	const tViewer = useTranslations('viewer');
	const router = useRouter();
	const [versions, setVersions] = useState<ProposalVersion[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isReverting, setIsReverting] = useState<string | null>(null);
	const [users, setUsers] = useState<Record<string, User>>({});
	const [revertDialogOpen, setRevertDialogOpen] = useState<string | null>(null);

	useEffect(() => {
		loadVersions();
	}, [proposal.id]);

	const loadVersions = async () => {
		setIsLoading(true);
		try {
			const versionsData = await proposalVersionsService.getVersions(proposal.id);
			setVersions(versionsData);

			// Load user information for all preparators
			const uniqueUserIds = new Set<string>();
			versionsData.forEach((version) => {
				if (version.preparator) {
					uniqueUserIds.add(version.preparator);
				}
			});

			const usersMap: Record<string, User> = {};
			await Promise.all(
				Array.from(uniqueUserIds).map(async (userId) => {
					try {
						const user = await usersService.getUserProfile(userId);
						if (user) {
							usersMap[userId] = user;
						}
					} catch (error) {
						console.error(`Failed to load user ${userId}:`, error);
					}
				})
			);
			setUsers(usersMap);
		} catch (error) {
			console.error('Failed to load versions:', error);
			toast.error(t('revertError'));
		} finally {
			setIsLoading(false);
		}
	};

	const handleRevert = async (versionId: string) => {
		setIsReverting(versionId);
		setRevertDialogOpen(null);
		try {
			const versionNumber = versions.find((v) => v.id === versionId)?.version_number || '';
			await proposalVersionsService.revertToVersion(proposal.id, versionId);
			toast.success(t('revertSuccess', { number: versionNumber }));

			// Reload the page to ensure all data is refreshed
			router.refresh();
			// Also reload the window to ensure complete refresh
			window.location.reload();
		} catch (error) {
			console.error('Failed to revert version:', error);
			toast.error(t('revertError'));
			setIsReverting(null);
		}
	};

	const getUserDisplayName = (userId: string): string => {
		const user = users[userId];
		if (!user) return tViewer('unknownUser');
		if (user.first_name || user.last_name) {
			return `${user.first_name || ''} ${user.last_name || ''}`.trim();
		}
		return user.display_name || tViewer('unknownUser');
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<History className="h-5 w-5" />
						{t('versions')}
					</CardTitle>
					<CardDescription>{t('versions')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center p-8">
						<Loader2 className="h-8 w-8 animate-spin" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (versions.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<History className="h-5 w-5" />
						{t('versions')}
					</CardTitle>
					<CardDescription>{t('versions')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8 text-muted-foreground">{t('noVersions')}</div>
				</CardContent>
			</Card>
		);
	}

	// Sort versions by created_at descending (newest first)
	const sortedVersions = [...versions].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);

	// The latest version is considered the current one
	const latestVersion = sortedVersions[0];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<History className="h-5 w-5" />
					{t('versions')}
				</CardTitle>
				<CardDescription>{t('versions')}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{sortedVersions.map((version) => {
						const isCurrent = version.id === latestVersion.id;
						return (
							<div
								key={version.id}
								className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-4 flex-1">
									<div className="flex flex-col gap-1">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{t('versionNumber', { number: version.version_number })}
											</span>
											{isCurrent && (
												<Badge variant="secondary" className="text-xs">
													{t('currentVersion')}
												</Badge>
											)}
										</div>
										<div className="text-sm text-muted-foreground">
											{t('createdAt')}: {formatDate(version.created_at)}
										</div>
										<div className="text-sm text-muted-foreground">
											{t('createdBy')}: {getUserDisplayName(version.preparator)}
										</div>
									</div>
								</div>
								{!isCurrent && (
									<AlertDialog
										open={revertDialogOpen === version.id}
										onOpenChange={(open) => setRevertDialogOpen(open ? version.id : null)}
									>
										<AlertDialogTrigger asChild>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={isReverting === version.id || isReverting !== null}
												onClick={() => setRevertDialogOpen(version.id)}
											>
												{isReverting === version.id ? (
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />
												) : (
													<RotateCcw className="w-4 h-4 mr-2" />
												)}
												{t('revertToVersion')}
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>{t('revertToVersion')}</AlertDialogTitle>
												<AlertDialogDescription>
													{t('revertConfirm')}
													<br />
													<br />
													<strong>{t('versionNumber', { number: version.version_number })}</strong> -{' '}
													{formatDate(version.created_at)}
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel
													disabled={isReverting === version.id}
													onClick={() => setRevertDialogOpen(null)}
												>
													{tCommon('cancel')}
												</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => handleRevert(version.id)}
													disabled={isReverting === version.id}
													className="bg-error hover:bg-error-dark text-error-foreground"
												>
													{isReverting === version.id ? (
														<>
															<Loader2 className="w-4 h-4 mr-2 animate-spin" />
															{tCommon('loading')}
														</>
													) : (
														t('revertToVersion')
													)}
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
