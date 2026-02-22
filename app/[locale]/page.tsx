import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';
import { PublicNavbar } from '@/components/navigation/public-navbar';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations('landing');
	const tAuth = await getTranslations('auth');
	const tDashboard = await getTranslations('dashboard');

	return (
		<div className="h-full bg-background flex flex-col">
			<PublicNavbar locale={locale} />

			<main className="flex-1 flex items-center justify-center container mx-auto px-4 py-16">
				<div className="text-center items-center flex flex-col space-y-6">
					<h1 className="text-6xl font-bold">Proposit</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('tagline')}</p>
					<div className="flex justify-center space-x-4">
						<Button size="lg" asChild>
							<Link href="/auth/signup">
								{tDashboard('getStarted')}
								<UserPlus size={18} className="ml-2" />
							</Link>
						</Button>
						<Button variant="outline" size="lg" asChild>
							<Link href="/auth/login">
								{tAuth('signIn')}
								<LogIn size={18} className="ml-2" />
							</Link>
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
