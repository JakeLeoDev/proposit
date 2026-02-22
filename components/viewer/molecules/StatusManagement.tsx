'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
	Link as LinkIcon,
	Copy,
	Loader2,
	Send,
	CheckCircle,
	XCircle,
	FileText,
	Undo2,
} from 'lucide-react';
import { linksService } from '@/lib/links-service';
import { proposalsService } from '@/lib/proposals-service';
import { organisationsService } from '@/lib/organisations-service';
import type { Link, Proposal, Organisation } from '@/lib/types';
import StatusBadge from '@/components/viewer/atoms/StatusBadge';
import { EmailProposalDialog } from '@/components/viewer/molecules/EmailProposalDialog';
import { cn } from '@/lib/utils';

interface StatusManagementProps {
	proposal: Proposal;
	organisationId: string;
	onProposalUpdate?: (proposal: Proposal) => void;
	showEmailButton?: boolean;
	emailEnabled?: boolean;
	recipientEmail?: string;
}

export default function StatusManagement({
	proposal,
	organisationId,
	onProposalUpdate,
	showEmailButton = false,
	emailEnabled = false,
	recipientEmail = '',
}: StatusManagementProps) {
	const t = useTranslations('proposals');
	const tViewer = useTranslations('viewer');
	const tCommon = useTranslations('common');
	const [link, setLink] = useState<Link | null>(null);
	const [isStatusLoading, setIsStatusLoading] = useState(false);
	const [organisation, setOrganisation] = useState<Organisation | null>(null);

	useEffect(() => {
		loadOrganisation();
	}, [organisationId]);

	const loadOrganisation = async () => {
		try {
			const org = await organisationsService.getOrganisation(organisationId);
			setOrganisation(org);
		} catch (error) {
			console.error('Failed to load organisation:', error);
		}
	};

	useEffect(() => {
		loadLink();
	}, [proposal.id]);

	const loadLink = async () => {
		try {
			const linkData = await linksService.getLinkByProposal(proposal.id);
			setLink(linkData);
		} catch (error) {
			console.error('Failed to load link:', error);
		}
	};

	const handleSend = async () => {
		setIsStatusLoading(true);
		try {
			const newLink = await linksService.createLink(proposal.id, organisationId);
			setLink(newLink);
			const updatedProposal = await proposalsService.updateProposal(proposal.id, { status: 'Sent' });
			onProposalUpdate?.(updatedProposal);
			toast.success(t('statusUpdated'));
		} catch {
			toast.error(t('linkGenerationFailed'));
		} finally {
			setIsStatusLoading(false);
		}
	};

	const handleCopyLink = async () => {
		if (!link) return;
		const linkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${proposal.id}?token=${link.token}`;
		await navigator.clipboard.writeText(linkUrl);
		toast.success(t('linkCopied'));
	};

	const handleRevertToDraft = async () => {
		setIsStatusLoading(true);
		try {
			if (link) {
				await linksService.deleteLink(link.id);
				setLink(null);
			}
			const updatedProposal = await proposalsService.updateProposal(proposal.id, { status: 'Draft' });
			onProposalUpdate?.(updatedProposal);
			toast.success(t('statusUpdated'));
		} catch {
			toast.error(t('statusUpdateFailed'));
		} finally {
			setIsStatusLoading(false);
		}
	};

	const handleStatusChange = async (newStatus: string) => {
		setIsStatusLoading(true);
		try {
			const updatedProposal = await proposalsService.updateProposal(proposal.id, {
				status: newStatus,
			});
			onProposalUpdate?.(updatedProposal);
			toast.success(t('statusUpdated'));
		} catch {
			toast.error(t('statusUpdateFailed'));
		} finally {
			setIsStatusLoading(false);
		}
	};

	const getStatusActions = () => {
		switch (proposal.status) {
			case 'Draft':
				return (
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button type="button" disabled={isStatusLoading} size="sm">
								{isStatusLoading ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Send className="w-4 h-4 mr-2" />
								)}
								{tViewer('generateLink')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{tViewer('generateLink')}</AlertDialogTitle>
								<AlertDialogDescription>{tViewer('generateLinkDescription')}</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="mt-3 text-sm space-y-1">
								<div>
									<span className="font-medium">{tViewer('titleLabel')}</span> {proposal.name || '-'}
								</div>
								{proposal.expiry_date && (
									<div>
										{tViewer('validUntil', {
											date: new Date(proposal.expiry_date).toLocaleDateString('de-DE'),
										})}
									</div>
								)}
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleSend}
									style={{
										backgroundColor: organisation?.color || 'var(--color-primary)',
										color: 'white',
									}}
									className="hover:opacity-90"
								>
									{tViewer('generateLink')}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				);
			case 'Sent':
				return (
					<div className="flex gap-2">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									type="button"
									disabled={isStatusLoading}
									size="sm"
									variant="outline"
									className="border-neutral-200 text-neutral-700 hover:bg-neutral-50"
								>
									{isStatusLoading ? (
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									) : (
										<Undo2 className="w-4 h-4 mr-2" />
									)}
									{tViewer('backToDraft')}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{tViewer('backToDraft')}</AlertDialogTitle>
									<AlertDialogDescription>{tViewer('backToDraftConfirm')}</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleRevertToDraft}
										className="bg-error hover:bg-error-dark text-error-foreground"
									>
										{tViewer('backToDraft')}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
						<Button
							type="button"
							onClick={() => handleStatusChange('Accepted')}
							disabled={isStatusLoading}
							size="sm"
							variant="outline"
							className="border-success-border text-success-light-foreground hover:bg-success-light"
						>
							{isStatusLoading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<CheckCircle className="w-4 h-4 mr-2" />
							)}
							{tViewer('statusAccepted')}
						</Button>
						<Button
							type="button"
							onClick={() => handleStatusChange('Rejected')}
							disabled={isStatusLoading}
							size="sm"
							variant="outline"
							className="border-error-border text-error-light-foreground hover:bg-error-light"
						>
							{isStatusLoading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<XCircle className="w-4 h-4 mr-2" />
							)}
							{tViewer('statusRejected')}
						</Button>
					</div>
				);
			case 'Read':
				return (
					<div className="flex gap-2">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									type="button"
									disabled={isStatusLoading}
									size="sm"
									variant="outline"
									className="border-neutral-200 text-neutral-700 hover:bg-neutral-50"
								>
									{isStatusLoading ? (
										<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									) : (
										<Undo2 className="w-4 h-4 mr-2" />
									)}
									{tViewer('backToDraft')}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{tViewer('backToDraft')}</AlertDialogTitle>
									<AlertDialogDescription>{tViewer('backToDraftConfirm')}</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleRevertToDraft}
										className="bg-error hover:bg-error-dark text-error-foreground"
									>
										{tViewer('backToDraft')}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
						<Button
							type="button"
							onClick={() => handleStatusChange('Accepted')}
							disabled={isStatusLoading}
							size="sm"
							variant="outline"
							className="border-success-border text-success-light-foreground hover:bg-success-light"
						>
							{isStatusLoading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<CheckCircle className="w-4 h-4 mr-2" />
							)}
							{tViewer('statusAccepted')}
						</Button>
						<Button
							type="button"
							onClick={() => handleStatusChange('Rejected')}
							disabled={isStatusLoading}
							size="sm"
							variant="outline"
							className="border-error-border text-error-light-foreground hover:bg-error-light"
						>
							{isStatusLoading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<XCircle className="w-4 h-4 mr-2" />
							)}
							{tViewer('statusRejected')}
						</Button>
					</div>
				);
			case 'Accepted':
			case 'Rejected':
				return (
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								type="button"
								disabled={isStatusLoading}
								size="sm"
								variant="outline"
								className="border-neutral-200 text-neutral-700 hover:bg-neutral-50"
							>
								{isStatusLoading ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Undo2 className="w-4 h-4 mr-2" />
								)}
								{tViewer('backToDraft')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{tViewer('backToDraft')}</AlertDialogTitle>
								<AlertDialogDescription>{tViewer('backToDraftConfirm')}</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleRevertToDraft}
									className="bg-error hover:bg-error-dark text-error-foreground"
								>
									{tViewer('backToDraft')}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				);
			default:
				return null;
		}
	};

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-5 w-5" />
					{tViewer('statusAndLinkManagement')}
				</CardTitle>
				<CardDescription>{tViewer('statusAndLinkDescription')}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Current Status */}
				<div className="flex items-center justify-between">
					<div>
						<div className="text-sm font-medium text-muted-foreground mb-2">
							{tViewer('currentStatus')}
						</div>
						<StatusBadge status={proposal.status} />
					</div>
					{getStatusActions()}
				</div>

				<Separator />

				{/* Link Management */}
				<div className="space-y-3">
					<div className="text-sm font-medium text-muted-foreground">{tViewer('linkManagement')}</div>

					{!link ? (
						<div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
							<div className="flex items-center gap-2">
								<LinkIcon className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">{tViewer('noLinkCreated')}</span>
							</div>
						</div>
					) : (
						<div
							className={cn(
								'flex items-center justify-between p-3 border rounded-lg',
								!organisation?.color && 'bg-primary/10 border-primary/20'
							)}
							style={{
								backgroundColor: organisation?.color ? `${organisation.color}15` : undefined,
								borderColor: organisation?.color ? `${organisation.color}40` : undefined,
							}}
						>
							<div className="flex items-center gap-2">
								<LinkIcon
									className="h-4 w-4"
									style={{ color: organisation?.color || 'var(--color-primary)' }}
								/>
								<span
									className="text-sm font-medium"
									style={{ color: organisation?.color || 'var(--color-primary)' }}
								>
									{tViewer('linkActive')}
								</span>
								<Badge variant="outline" className="text-xs">
									{tViewer('validUntilDate', { date: new Date(link.exp_date).toLocaleDateString('de-DE') })}
								</Badge>
							</div>
							<div className="flex gap-2">
								<Button type="button" onClick={handleCopyLink} size="sm" variant="outline">
									<Copy className="w-4 h-4 mr-2" />
									{tViewer('copy')}
								</Button>
								{showEmailButton && (
									<EmailProposalDialog
										proposalId={proposal.id}
										recipientEmail={recipientEmail}
										emailEnabled={emailEnabled}
									/>
								)}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
