import { ResetPasswordForm } from './reset-password-form';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ResetPasswordPage() {
	const t = await getTranslations('auth');

	return (
		<div className="max-w-md w-full space-y-8 p-8">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-3xl">{t('resetPassword')}</CardTitle>
					<p className="text-muted-foreground">{t('resetPasswordDescription')}</p>
				</CardHeader>
				<CardContent>
					<ResetPasswordForm />
				</CardContent>
			</Card>
		</div>
	);
}
