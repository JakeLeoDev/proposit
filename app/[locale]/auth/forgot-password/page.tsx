import { ForgotPasswordForm } from './forgot-password-form';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ForgotPasswordPage() {
	const t = await getTranslations('auth');

	return (
		<div className="max-w-md w-full space-y-8 p-8">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-3xl">{t('resetPasswordTitle')}</CardTitle>
					<p className="text-muted-foreground">{t('resetPasswordDescription')}</p>
				</CardHeader>
				<CardContent>
					<ForgotPasswordForm />
					<div className="mt-4 text-center">
						<Link
							href="/auth/login"
							className="text-sm text-muted-foreground hover:text-primary transition-colors"
						>
							{t('backToLogin')}
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
