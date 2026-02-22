import { SignUpForm } from '@/components/auth/signup-form';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSingleTenant, isMultiInviteTenant, getContactEmail } from '@/lib/tenant-config';
import { createServiceClient } from '@/lib/supabase/server';

export default async function SignUpPage({
	searchParams,
}: {
	searchParams: Promise<{ invitation?: string }>;
}) {
	const t = await getTranslations('auth');
	const params = await searchParams;
	const invitationToken = params.invitation;
	const contactEmail = getContactEmail();

	let isRegistrationBlocked = false;

	if (isSingleTenant() && !invitationToken) {
		const serviceClient = createServiceClient();
		const { count } = await serviceClient
			.from('organisations')
			.select('id', { count: 'exact', head: true });

		isRegistrationBlocked = (count ?? 0) > 0;
	}

	// In multi-invite mode without a valid organisation invitation token,
	// registration is blocked. The form itself will validate the email
	// against the allowlist on submit.
	const tenantMode = isMultiInviteTenant() ? 'multi-invite' : isSingleTenant() ? 'single' : 'multi';

	return (
		<div className="max-w-md w-full space-y-8 p-8">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-3xl">{t('createAccount')}</CardTitle>
					<p className="text-muted-foreground">
						{t('hasAccount')}{' '}
						<Link href="/auth/login" className="text-primary hover:underline">
							{t('signIn')}
						</Link>
					</p>
				</CardHeader>
				<CardContent>
					<SignUpForm
						isRegistrationBlocked={isRegistrationBlocked}
						tenantMode={tenantMode}
						contactEmail={contactEmail}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
