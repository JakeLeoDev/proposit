'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { UserPlus, Mail, Lock } from 'lucide-react';
import { invitationsService } from '@/lib/invitations-service';
import { toast } from 'sonner';

interface SignUpFormProps {
	isRegistrationBlocked?: boolean;
	tenantMode?: 'single' | 'multi' | 'multi-invite';
	contactEmail?: string;
}

export function SignUpForm({
	isRegistrationBlocked = false,
	tenantMode = 'single',
	contactEmail,
}: SignUpFormProps) {
	const searchParams = useSearchParams();
	const params = useParams();
	const locale = (params?.locale as string) || 'en';
	const invitationToken = searchParams.get('invitation');

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
	const t = useTranslations('auth');

	// Pre-fill email from invitation
	useEffect(() => {
		const loadInvitation = async () => {
			if (invitationToken) {
				try {
					const invitation = await invitationsService.getInvitationByToken(invitationToken);
					if (invitation && !invitation.accepted_at) {
						setEmail(invitation.email);
						setInvitationEmail(invitation.email);
					}
				} catch {
					// Silently handle invitation loading errors
				}
			}
		};
		loadInvitation();
	}, [invitationToken]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setMessage('');

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			setLoading(false);
			return;
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters long');
			setLoading(false);
			return;
		}

		// In multi-invite mode, check the allowlist unless the user has an organisation invitation token
		if (tenantMode === 'multi-invite' && !invitationToken) {
			const { checkEmailAllowedAction } = await import('@/lib/actions/registration-actions');
			const { allowed } = await checkEmailAllowedAction(email);
			if (!allowed) {
				setError(t('emailNotAllowed'));
				setLoading(false);
				return;
			}
		}

		const supabase = createClient();

		try {
			// Sign up the user (creates auth.users record)
			const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
			if (!baseUrl) {
				setError('Application URL is not configured. Please contact support.');
				setLoading(false);
				return;
			}

			const redirectUrl = `${baseUrl}/${locale}/auth/callback`;

			const nameParts = displayName.trim().split(/\s+/);
			const firstName = nameParts[0] || null;
			const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
			const resolvedDisplayName = displayName.trim() || email.split('@')[0];

			const { data: authData, error: authError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: redirectUrl,
					data: {
						first_name: firstName,
						last_name: lastName,
						display_name: resolvedDisplayName,
					},
				},
			});

			if (authError) {
				// Handle specific error types
				if (
					authError.message.includes('429') ||
					authError.message.includes('rate limit') ||
					authError.message.includes('too many requests')
				) {
					setError(t('emailRateLimit'));
				} else {
					setError(authError.message);
				}
				setLoading(false);
				return;
			}

			if (authData.user) {
				// Process invitation immediately if token is present
				if (invitationToken) {
					try {
						const { acceptInvitationAction } = await import('@/lib/actions/invitation-actions');
						const result = await acceptInvitationAction(invitationToken, authData.user.id);
						if (!result.success) {
							// Silently handle invitation errors - don't fail the signup process
							console.error('Failed to accept invitation:', result.error);
						}
					} catch (error) {
						// Silently handle invitation errors - don't fail the signup process
						console.error('Failed to accept invitation:', error);
					}
				}

				setMessage(t('checkYourEmail'));
				setLoading(false);

				// Don't clear email - we need it for resend functionality
				setPassword('');
				setConfirmPassword('');
				setDisplayName('');
			}
		} catch {
			setError(t('rateLimitExceeded'));
			setLoading(false);
		}
	};

	const handleResendVerification = async () => {
		if (!email) return;

		setResending(true);
		setError('');

		const supabase = createClient();

		try {
			const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
			if (!baseUrl) {
				setError('Application URL is not configured. Please contact support.');
				setResending(false);
				return;
			}

			const { error } = await supabase.auth.resend({
				type: 'signup',
				email,
				options: {
					emailRedirectTo: `${baseUrl}/${locale}/auth/callback`,
				},
			});

			if (error) {
				// Handle specific error types
				if (
					error.message.includes('429') ||
					error.message.includes('rate limit') ||
					error.message.includes('too many requests')
				) {
					setError(t('emailRateLimit'));
				} else {
					setError(error.message);
				}
			} else {
				toast.success(t('emailResent'));
			}
		} catch {
			// Handle unexpected errors
			setError(t('rateLimitExceeded'));
		}

		setResending(false);
	};

	// Show registration blocked message (single-tenant after first org, or multi-invite without token)
	if (isRegistrationBlocked) {
		return (
			<Alert>
				<Lock className="h-4 w-4" />
				<AlertDescription>
					<div className="font-semibold mb-1">{t('registrationClosed')}</div>
					<div className="text-sm">{t('registrationClosedDescription')}</div>
					{contactEmail && (
						<div className="text-sm mt-2">
							{t.rich('registrationClosedContact', {
								email: () => (
									<a
										href={`mailto:${contactEmail}`}
										className="underline hover:text-foreground"
									>
										{contactEmail}
									</a>
								),
							})}
						</div>
					)}
				</AlertDescription>
			</Alert>
		);
	}

	// Show success message with resend button if message is set
	if (message) {
		return (
			<div className="space-y-4">
				<Alert variant="success">
					<Mail className="h-4 w-4" />
					<AlertDescription>
						<div className="font-semibold mb-1">{t('checkYourEmail')}</div>
						<div className="text-sm">{t('magicLinkSentDescription')}</div>
					</AlertDescription>
				</Alert>
				<div className="space-y-2">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={handleResendVerification}
						disabled={resending}
					>
						{resending ? t('resendingEmail') : t('resendEmail')}
						<Mail size={16} className="ml-2" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						className="w-full"
						onClick={() => {
							setMessage('');
							setError(''); // Clear error when going back
						}}
					>
						{t('backToLogin')}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<Alert variant="destructive">
					<AlertDescription>
						<div>{error}</div>
						{error === t('emailNotAllowed') && contactEmail && (
							<div className="mt-1">
								{t.rich('registrationClosedContact', {
									email: () => (
										<a
											href={`mailto:${contactEmail}`}
											className="underline hover:text-foreground"
										>
											{contactEmail}
										</a>
									),
								})}
							</div>
						)}
					</AlertDescription>
				</Alert>
			)}

			<div className="space-y-2">
				<Label htmlFor="displayName">{t('displayName') || 'Display Name'}</Label>
				<Input
					id="displayName"
					type="text"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
					placeholder="Your full name"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="email">{t('email')}</Label>
				<Input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					disabled={!!invitationEmail}
					className={invitationEmail ? 'bg-muted' : ''}
				/>
				{invitationEmail && (
					<p className="text-sm text-muted-foreground">{t('invitation.invitationEmailLocked')}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="password">{t('password')}</Label>
				<Input
					id="password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					minLength={6}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
				<Input
					id="confirmPassword"
					type="password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
					minLength={6}
				/>
			</div>

			<Button type="submit" className="w-full" disabled={loading}>
				<UserPlus size={16} className="mr-2" />
				{loading ? 'Creating account...' : t('signUp')}
			</Button>
		</form>
	);
}
