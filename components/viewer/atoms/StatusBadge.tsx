'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface StatusBadgeProps {
	status: string;
	className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
	const t = useTranslations('viewer');

	const getStatusConfig = (status: string) => {
		switch (status) {
			case 'Draft':
				return {
					variant: 'secondary' as const,
					className: 'bg-neutral-100 text-neutral-800 border-neutral-200',
					label: t('statusDraft'),
				};
			case 'Sent':
				return {
					variant: 'secondary' as const,
					className: 'bg-warning-light text-warning-light-foreground border-warning-border',
					label: t('statusSent'),
				};
			case 'Read':
				return {
					variant: 'secondary' as const,
					className: 'bg-status-light text-status-light-foreground border-status-border',
					label: t('statusRead'),
				};
			case 'Accepted':
				return {
					variant: 'secondary' as const,
					className: 'bg-success-light text-success-light-foreground border-success-border',
					label: t('statusAccepted'),
				};
			case 'Rejected':
				return {
					variant: 'destructive' as const,
					className: 'bg-error-light text-error-light-foreground border-error-border',
					label: t('statusRejected'),
				};
			default:
				return {
					variant: 'secondary' as const,
					className: 'bg-neutral-100 text-neutral-800 border-neutral-200',
					label: status,
				};
		}
	};

	const config = getStatusConfig(status);

	return (
		<Badge variant={config.variant} className={cn(config.className, className)}>
			{config.label}
		</Badge>
	);
}
