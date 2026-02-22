'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPasswordForm() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();
	const t = useTranslations('auth');
	const tCommon = useTranslations('common');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		// Validate passwords match
		if (password !== confirmPassword) {
			setError(t('passwordsDoNotMatch'));
			setLoading(false);
			toast.error(t('passwordsDoNotMatch'));
			return;
		}

		const supabase = createClient();

		const { error } = await supabase.auth.updateUser({
			password: password,
		});

		if (error) {
			setError(error.message);
			setLoading(false);
			toast.error(error.message);
		} else {
			toast.success(t('passwordUpdated'));
			// Redirect to login page after successful password reset
			setTimeout(() => {
				router.push('/auth/login');
			}, 1500);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="space-y-2">
				<Label htmlFor="password">{t('newPassword')}</Label>
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
				<Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
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
				{loading ? tCommon('loading') : t('updatePassword')}
				<Lock size={16} className="ml-2" />
			</Button>
		</form>
	);
}
