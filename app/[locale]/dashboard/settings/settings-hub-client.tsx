'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

export function SettingsHubClient() {
	const tSettings = useTranslations('settings');

	return (
		<div className="container mx-auto px-6 pt-6 pb-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{tSettings('title')}</h1>
					<p className="text-muted-foreground">{tSettings('description')}</p>
				</div>
				<Separator />
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Link href="/dashboard/settings/user">
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle>{tSettings('userSettings')}</CardTitle>
									<ArrowRight className="h-4 w-4 text-muted-foreground" />
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">{tSettings('userSettingsDescription')}</p>
							</CardContent>
						</Card>
					</Link>
					<Link href="/dashboard/settings/organisation">
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle>{tSettings('organisationSettings')}</CardTitle>
									<ArrowRight className="h-4 w-4 text-muted-foreground" />
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">{tSettings('organisationSettingsDescription')}</p>
							</CardContent>
						</Card>
					</Link>
				</div>
			</div>
		</div>
	);
}
