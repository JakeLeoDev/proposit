import type { Organisation } from '@/lib/types';
import { getTranslations } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { getStorageUrl } from '@/lib/utils';

interface DashboardHeaderProps {
	organization: Organisation;
}

export async function DashboardHeader({ organization }: DashboardHeaderProps) {
	const t = await getTranslations('dashboard');
	const logoUrl = getStorageUrl('Media', organization.logo);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				{logoUrl && (
					<Image
						src={logoUrl}
						alt={`${organization.name} Logo`}
						width={60}
						height={60}
						className="h-16 w-auto object-contain rounded-lg"
					/>
				)}
				<div>
					<h1 className="text-3xl font-bold">{t('title')}</h1>
					<p className="text-muted-foreground mt-2">
						{t('organization')}: {organization.name}
					</p>
				</div>
			</div>
			<Separator />
		</div>
	);
}
