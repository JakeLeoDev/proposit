import { LoginForm } from '@/components/auth/login-form';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const t = await getTranslations('auth');
	const params = await searchParams;
	const error = params.error as string | undefined;

	return (
		<div className="max-w-md w-full space-y-8 p-8">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-3xl">{t('welcomeBack')}</CardTitle>
					<p className="text-muted-foreground">
						{t('noAccount')}{' '}
						<Link href="/auth/signup" className="text-primary hover:underline">
							{t('signUp')}
						</Link>
					</p>
				</CardHeader>
				<CardContent>
					<LoginForm initialError={error} />
				</CardContent>
			</Card>
		</div>
	);
}
