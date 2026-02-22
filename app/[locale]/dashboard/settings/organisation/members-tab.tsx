'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { invitationsService } from '@/lib/invitations-service';
import type { OrganisationMember, OrganisationInvitation } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Check, UserPlus, UserMinus, Trash2 } from 'lucide-react';
import { sendInvitationEmailAction } from '@/lib/actions/invitation-actions';

interface MembersTabProps {
	organisationId: string;
	currentUserId: string;
	emailEnabled: boolean;
}

export function MembersTab({ organisationId, currentUserId, emailEnabled }: MembersTabProps) {
	const t = useTranslations('settings.members');
	const [members, setMembers] = useState<OrganisationMember[]>([]);
	const [invitations, setInvitations] = useState<OrganisationInvitation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [inviteEmail, setInviteEmail] = useState('');
	const [isInviting, setIsInviting] = useState(false);
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [copiedToken, setCopiedToken] = useState<string | null>(null);
	const [sendEmail, setSendEmail] = useState(true);

	const supabase = createClient();

	const loadMembers = async () => {
		try {
			setError(null);

			// Get organisation members
			const { data: orgMembersData, error: orgMembersError } = await supabase
				.from('organisation_users')
				.select('*')
				.eq('organisation_id', organisationId);

			if (orgMembersError) throw orgMembersError;

			if (!orgMembersData || orgMembersData.length === 0) {
				setMembers([]);
			} else {
				// Get user details for all members
				const userIds = orgMembersData.map((member) => member.user_id);
				const { data: usersData, error: usersError } = await supabase
					.from('users')
					.select('id, first_name, last_name, display_name, avatar_url')
					.in('id', userIds);

				if (usersError) throw usersError;

				// Combine organisation_users with users data
				const membersWithUsers = orgMembersData.map((orgMember) => ({
					...orgMember,
					users: usersData?.find((user) => user.id === orgMember.user_id) || {
						id: orgMember.user_id,
						first_name: null,
						last_name: null,
						display_name: null,
						avatar_url: null,
					},
				}));

				setMembers(membersWithUsers as any);
			}

			// Get pending invitations
			const invitationsData = await invitationsService.getInvitations(organisationId);
			setInvitations(invitationsData.filter((inv) => !inv.accepted_at));
		} catch (e: any) {
			setError(e.message || 'Failed to load members');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadMembers();

		// Subscribe to members changes
		const membersChannel = supabase
			.channel(`members-${organisationId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'organisation_users',
					filter: `organisation_id=eq.${organisationId}`,
				},
				() => loadMembers()
			)
			.subscribe();

		// Subscribe to invitations changes
		const invitationsChannel = invitationsService.subscribeToInvitations(organisationId, () =>
			loadMembers()
		);

		return () => {
			supabase.removeChannel(membersChannel);
			supabase.removeChannel(invitationsChannel);
		};
	}, [organisationId]);

	const handleInvite = async () => {
		if (!inviteEmail.trim()) {
			toast.error(t('emailRequired'));
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(inviteEmail)) {
			toast.error(t('invalidEmail'));
			return;
		}

		setIsInviting(true);
		try {
			// Check if email is already a member
			const existingMember = members.find(
				(m) => m.users.display_name?.toLowerCase() === inviteEmail.toLowerCase()
			);
			if (existingMember) {
				toast.error(t('alreadyMember'));
				setIsInviting(false);
				return;
			}

			// Check if email is already invited
			const existingInvitation = invitations.find(
				(inv) => inv.email.toLowerCase() === inviteEmail.toLowerCase()
			);
			if (existingInvitation) {
				toast.error(t('alreadyInvited'));
				setIsInviting(false);
				return;
			}

			const invitation = await invitationsService.createInvitation(
				organisationId,
				inviteEmail,
				currentUserId
			);

			if (sendEmail && emailEnabled) {
				const emailResult = await sendInvitationEmailAction(invitation.id);
				if (emailResult.success) {
					toast.success(t('invitationCreatedWithEmail'));
				} else {
					toast.success(t('invitationCreated'));
					toast.error(t('invitationEmailFailed'));
				}
			} else {
				toast.success(t('invitationCreated'));
			}

			setInviteEmail('');
			setSendEmail(true);
			setShowInviteDialog(false);
			loadMembers();
		} catch (e: any) {
			toast.error(e.message || t('invitationFailed'));
		} finally {
			setIsInviting(false);
		}
	};

	const handleDeleteInvitation = async (invitationId: string) => {
		try {
			await invitationsService.deleteInvitation(invitationId);
			toast.success(t('invitationDeleted'));
			loadMembers();
		} catch (e: any) {
			toast.error(e.message || t('deleteFailed'));
		}
	};

	const handleRemoveMember = async (userId: string) => {
		if (userId === currentUserId) {
			toast.error(t('cannotRemoveSelf'));
			return;
		}

		try {
			const { error } = await supabase
				.from('organisation_users')
				.delete()
				.eq('organisation_id', organisationId)
				.eq('user_id', userId);

			if (error) throw error;
			toast.success(t('memberRemoved'));
			loadMembers();
		} catch (e: any) {
			toast.error(e.message || t('removeFailed'));
		}
	};

	const handleCopyInvitationLink = async (token: string) => {
		try {
			const invitationUrl = invitationsService.generateInvitationUrl(token);
			await navigator.clipboard.writeText(invitationUrl);
			setCopiedToken(token);
			toast.success(t('linkCopied'));

			// Reset copied state after 2 seconds
			setTimeout(() => setCopiedToken(null), 2000);
		} catch {
			toast.error(t('copyFailed'));
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardHeader>
						<CardTitle>{t('title')}</CardTitle>
						<CardDescription>{t('description')}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-muted-foreground">{t('loading')}</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Current Members */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
					<div>
						<CardTitle>{t('currentMembers')}</CardTitle>
						<CardDescription>{t('currentMembersDescription', { count: members.length })}</CardDescription>
					</div>
					<AlertDialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
						<AlertDialogTrigger asChild>
							<Button>
								<UserPlus className="h-4 w-4 mr-2" />
								{t('inviteMember')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t('inviteMember')}</AlertDialogTitle>
								<AlertDialogDescription>{t('inviteDescription')}</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid gap-2">
									<Label htmlFor="email">{t('emailAddress')}</Label>
									<Input
										id="email"
										type="email"
										placeholder={t('emailPlaceholder')}
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												handleInvite();
											}
										}}
									/>
								</div>
								<div className="flex items-center gap-2">
									<Checkbox
										id="send-email"
										checked={sendEmail && emailEnabled}
										disabled={!emailEnabled}
										onCheckedChange={(checked: boolean | 'indeterminate') => setSendEmail(checked === true)}
									/>
									<Label htmlFor="send-email" className={!emailEnabled ? 'text-muted-foreground' : ''}>
										{emailEnabled ? t('sendInvitationEmail') : t('sendInvitationEmailDisabled')}
									</Label>
								</div>
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isInviting}>{t('cancel')}</AlertDialogCancel>
								<Button onClick={handleInvite} disabled={isInviting}>
									{isInviting ? t('sending') : t('sendInvitation')}
								</Button>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{members.map((member) => (
							<div
								key={member.user_id}
								className="flex items-center justify-between border-b pb-4 last:border-0"
							>
								<div className="flex items-center space-x-4">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
										{member.users.first_name?.[0]?.toUpperCase() ||
											member.users.display_name?.[0]?.toUpperCase() ||
											'U'}
									</div>
									<div>
										<p className="font-medium">
											{member.users.first_name && member.users.last_name
												? `${member.users.first_name} ${member.users.last_name}`
												: member.users.display_name || t('unnamed')}
										</p>
										<p className="text-sm text-muted-foreground">
											{t('joinedAt', {
												date: new Date(member.joined_at).toLocaleDateString(),
											})}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="secondary">{member.role}</Badge>
									{member.user_id !== currentUserId && (
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant="destructive" size="sm">
													<UserMinus className="h-4 w-4 mr-2" />
													{t('remove')}
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>{t('removeMemberTitle')}</AlertDialogTitle>
													<AlertDialogDescription>{t('removeMemberDescription')}</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
													<AlertDialogAction onClick={() => handleRemoveMember(member.user_id)}>
														{t('remove')}
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									)}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Pending Invitations */}
			{invitations.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{t('pendingInvitations')}</CardTitle>
						<CardDescription>
							{t('pendingInvitationsDescription', { count: invitations.length })}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{invitations.map((invitation) => (
								<div
									key={invitation.id}
									className="flex items-center justify-between border-b pb-4 last:border-0"
								>
									<div className="flex items-center space-x-4">
										<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
											<svg
												className="h-5 w-5 text-muted-foreground"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
												/>
											</svg>
										</div>
										<div>
											<p className="font-medium">{invitation.email}</p>
											<p className="text-sm text-muted-foreground">
												{t('invitedAt', {
													date: new Date(invitation.created_at).toLocaleDateString(),
												})}
												{' • '}
												{t('expiresAt', {
													date: new Date(invitation.expires_at).toLocaleDateString(),
												})}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="outline">{t('pending')}</Badge>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleCopyInvitationLink(invitation.token)}
										>
											{copiedToken === invitation.token ? (
												<Check className="h-4 w-4" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</Button>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant="destructive" size="sm">
													<Trash2 className="h-4 w-4 mr-2" />
													{t('revoke')}
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>{t('revokeInvitationTitle')}</AlertDialogTitle>
													<AlertDialogDescription>{t('revokeInvitationDescription')}</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
													<AlertDialogAction onClick={() => handleDeleteInvitation(invitation.id)}>
														{t('revoke')}
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
