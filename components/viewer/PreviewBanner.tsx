'use client';

import { useTranslations } from 'next-intl';

export function PreviewBanner() {
	const t = useTranslations('viewer');

	return (
		<div className="bg-warning-light border-b border-warning-border px-4 py-2 top-0 z-50 absolute w-full">
			<div className="container mx-auto flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
					<span className="text-sm font-medium text-warning-light-foreground">{t('previewMode')}</span>
					<span className="text-xs text-warning-dark">{t('previewModeDescription')}</span>
				</div>
				<div className="text-xs text-warning-dark">{t('adminPreview')}</div>
			</div>
		</div>
	);
}
