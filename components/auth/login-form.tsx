'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { LogIn, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface LoginFormProps {
	initialError?: string;
}

export function LoginForm({ initialError }: LoginFormProps) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [error, setError] = useState(initialError || '');
	const [useMagicLink, setUseMagicLink] = useState(true);
	const [magicLinkSent, setMagicLinkSent] = useState(false);
	const [otpCode, setOtpCode] = useState('');
	const router = useRouter();
	const params = useParams();
	const locale = (params?.locale as string) || 'en';
	const t = useTranslations('auth');
	const tCommon = useTranslations('common');

	// Update error when initialError changes
	useEffect(() => {
		if (initialError) {
			setError(initialError);
		}
	}, [initialError]);

	const handleMagicLinkSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const supabase = createClient();

		// Get the current URL to build the redirect URL
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (!baseUrl) {
			setError('Application URL is not configured. Please contact support.');
			setLoading(false);
			return;
		}

		const redirectUrl = `${baseUrl}/${locale}/auth/callback`;

		try {
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: {
					emailRedirectTo: redirectUrl,
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
				setLoading(false);
			} else {
				setMagicLinkSent(true);
				setLoading(false);
				toast.success(t('magicLinkSent'));
			}
		} catch {
			// Handle unexpected errors
			setError(t('rateLimitExceeded'));
			setLoading(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const supabase = createClient();

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(error.message);
			setLoading(false);
		} else {
			router.push('/dashboard');
			router.refresh();
		}
	};

	const handleVerifyOtp = async (e: React.FormEvent) => {
		e.preventDefault();
		setVerifying(true);
		setError('');

		const supabase = createClient();

		const { error } = await supabase.auth.verifyOtp({
			email,
			token: otpCode,
			type: 'email',
		});

		if (error) {
			setError(error.message);
			setVerifying(false);
		} else {
			router.push('/dashboard');
			router.refresh();
		}
	};

	const handleResendMagicLink = async () => {
		if (!email) return;

		setResending(true);
		setError('');

		const supabase = createClient();
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (!baseUrl) {
			setError('Application URL is not configured. Please contact support.');
			setResending(false);
			return;
		}

		const redirectUrl = `${baseUrl}/${locale}/auth/callback`;

		try {
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: {
					emailRedirectTo: redirectUrl,
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

	if (magicLinkSent) {
		return (
			<div className="space-y-4">
				<Alert variant="success">
					<Mail className="h-4 w-4" />
					<AlertDescription>
						<div className="font-semibold mb-1">{t('checkYourEmail')}</div>
						<div className="text-sm">{t('magicLinkSentDescription')}</div>
					</AlertDescription>
				</Alert>
				<form onSubmit={handleVerifyOtp} className="space-y-2">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<div className="space-y-2">
						<Label htmlFor="otp-code">{t('otpCode')}</Label>
						<Input
							id="otp-code"
							type="text"
							inputMode="numeric"
							placeholder={t('otpCodePlaceholder')}
							value={otpCode}
							onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
							maxLength={6}
							autoComplete="one-time-code"
						/>
					</div>
					<Button type="submit" className="w-full" disabled={verifying || otpCode.length !== 6}>
						{verifying ? tCommon('loading') : t('verifyCode')}
					</Button>
				</form>
				<div className="space-y-2">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={handleResendMagicLink}
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
							setMagicLinkSent(false);
							setOtpCode('');
							setError('');
						}}
					>
						{tCommon('back')}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form
			onSubmit={useMagicLink ? handleMagicLinkSubmit : handlePasswordSubmit}
			className="space-y-4"
		>
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="space-y-2">
				<Label htmlFor="email">{t('email')}</Label>
				<Input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
			</div>

			{!useMagicLink && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="password">{t('password')}</Label>
						<Link
							href="/auth/forgot-password"
							className="text-sm text-muted-foreground hover:text-primary transition-colors"
						>
							{t('forgotPassword')}
						</Link>
					</div>
					<Input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
			)}

			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? tCommon('loading') : useMagicLink ? t('sendMagicLink') : t('signIn')}
				{useMagicLink ? <Mail size={16} className="ml-2" /> : <LogIn size={16} className="ml-2" />}
			</Button>

			<div className="text-center">
				<button
					type="button"
					className="text-sm text-muted-foreground hover:text-primary transition-colors"
					onClick={() => setUseMagicLink(!useMagicLink)}
				>
					{useMagicLink ? t('usePassword') : t('useMagicLink')}
				</button>
			</div>
		</form>
	);
}
