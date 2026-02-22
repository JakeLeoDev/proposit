'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface TocEntry {
	id: string;
	title: string;
	pageNumber: number;
}

interface TableOfContentsProps {
	entries: TocEntry[];
	className?: string;
}

export default function TableOfContents({ entries, className }: TableOfContentsProps) {
	const t = useTranslations('viewer');

	return (
		<div className={cn('w-full', className)}>
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-black mb-2">{t('tableOfContents')}</h1>
				<div className="h-1 w-24 bg-info"></div>
			</div>

			<div className="space-y-3">
				{entries.map((entry, index) => (
					<div
						key={entry.id}
						className="flex items-start justify-between border-b border-neutral-200 pb-2"
					>
						<div className="flex items-start gap-3 flex-1">
							<span className="text-neutral-600 font-medium min-w-[2rem]">{index + 1}.</span>
							<span className="text-neutral-900 flex-1">{entry.title}</span>
						</div>
						<span className="text-neutral-600 font-medium ml-4">{entry.pageNumber}</span>
					</div>
				))}
			</div>
		</div>
	);
}
