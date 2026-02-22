'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { invitationsService } from '@/lib/invitations-service';
import { acceptInvitationAction } from '@/lib/actions/invitation-actions';
import { createClient } from '@/lib/supabase/client';
import type { OrganisationInvitation } from '@/lib/types';

export function AcceptInvitationClient() {
	const t = useTranslations('auth.invitation');
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get('token');

	const [invitation, setInvitation] = useState<OrganisationInvitation | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAccepting, setIsAccepting] = useState(false);

	const supabase = createClient();

	useEffect(() => {
		const loadInvitation = async () => {
			if (!token) {
				setError(t('invalidToken'));
				setIsLoading(false);
				return;
			}

			try {
				const inv = await invitationsService.getInvitationByToken(token);
				if (!inv) {
					setError(t('notFound'));
					setIsLoading(false);
					return;
				}

				if (inv.accepted_at) {
					setError(t('alreadyAccepted'));
					setIsLoading(false);
					return;
				}

				const expiresAt = new Date(inv.expires_at);
				if (expiresAt < new Date()) {
					setError(t('expired'));
					setIsLoading(false);
					return;
				}

				setInvitation(inv);
			} catch (e: any) {
				setError(e.message || t('loadError'));
			} finally {
				setIsLoading(false);
			}
		};

		loadInvitation();
	}, [token, t]);

	const handleAccept = async () => {
		if (!invitation || !token) return;

		setIsAccepting(true);
		try {
			// Check if user is logged in
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				// Redirect to signup with the invitation token
				router.push(`/auth/signup?invitation=${token}`);
				return;
			}

			// Accept the invitation using server action (bypasses RLS)
			const result = await acceptInvitationAction(token, user.id);

			if (!result.success) {
				throw new Error(result.error || t('acceptError'));
			}

			toast.success(t('success'));

			// Redirect to dashboard
			router.push('/dashboard');
		} catch (e: any) {
			toast.error(e.message || t('acceptError'));
		} finally {
			setIsAccepting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>{t('title')}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-muted-foreground">{t('loading')}</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>{t('title')}</CardTitle>
					</CardHeader>
					<CardContent>
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
						<div className="mt-4">
							<Button variant="outline" onClick={() => router.push('/auth/login')} className="w-full">
								{t('goToLogin')}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{t('title')}</CardTitle>
					<CardDescription>{t('description')}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border p-4">
						<p className="text-sm font-medium">{t('invitedTo')}</p>
						<p className="text-sm text-muted-foreground">{invitation?.email}</p>
					</div>

					<div className="space-y-2">
						<Button onClick={handleAccept} disabled={isAccepting} className="w-full">
							{isAccepting ? t('accepting') : t('accept')}
						</Button>
						<Button
							variant="outline"
							onClick={() => router.push('/auth/login')}
							disabled={isAccepting}
							className="w-full"
						>
							{t('cancel')}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
