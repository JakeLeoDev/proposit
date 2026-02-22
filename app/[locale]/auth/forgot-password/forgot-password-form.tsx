'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
	const params = useParams();
	const locale = (params?.locale as string) || 'en';
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [sent, setSent] = useState(false);
	const t = useTranslations('auth');
	const tCommon = useTranslations('common');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		const supabase = createClient();

		// Get the current URL to build the redirect URL
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (!baseUrl) {
			setError(tCommon('appUrlNotConfigured'));
			setLoading(false);
			toast.error(tCommon('appUrlNotConfigured'));
			return;
		}

		const redirectUrl = `${baseUrl}/${locale}/auth/reset-password`;

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: redirectUrl,
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
				toast.error(error.message);
			} else {
				setSent(true);
				setLoading(false);
				toast.success(t('resetLinkSent'));
			}
		} catch {
			// Handle unexpected errors
			setError(t('rateLimitExceeded'));
			setLoading(false);
			toast.error(t('rateLimitExceeded'));
		}
	};

	if (sent) {
		return (
			<div className="space-y-4">
				<Alert variant="success">
					<Mail className="h-4 w-4" />
					<AlertDescription>
						<div className="font-semibold mb-1">{t('resetLinkSent')}</div>
						<div className="text-sm">{t('resetLinkSentDescription')}</div>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
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

			<Button type="submit" className="w-full" disabled={loading}>
				{loading ? tCommon('loading') : t('sendResetLink')}
				<Mail size={16} className="ml-2" />
			</Button>
		</form>
	);
}
