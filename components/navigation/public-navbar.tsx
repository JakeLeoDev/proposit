import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface PublicNavbarProps {
	locale: string;
}

export async function PublicNavbar({ locale }: PublicNavbarProps) {
	const t = await getTranslations('navigation');

	return (
		<header className="border-b flex-shrink-0">
			<div className="container mx-auto px-4 py-4">
				<nav className="flex items-center justify-between">
					<Link href={`/${locale}`} className="flex items-center gap-0">
						<Logo width={32} height={32} className="h-7 w-auto object-contain" alt="Proposit" />
						<h1 className="text-xl font-bold">roposit</h1>
					</Link>
					<div className="flex items-center space-x-4">
						<Button asChild>
							<Link href={`/${locale}/dashboard`}>
								{t('toDashboard')}
								<ArrowRight size={16} className="ml-2" />
							</Link>
						</Button>
					</div>
				</nav>
			</div>
		</header>
	);
}
