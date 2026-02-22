'use client';

import type { ComponentProps } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type ContextProps = ComponentProps<'button'> & {
	/** Optional usage payload to enable breakdown view */
	usage?: {
		totalTokens?: number;
		inputTokens?: number;
		outputTokens?: number;
		reasoningTokens?: number;
		cachedInputTokens?: number;
		context?: {
			totalMax?: number;
			combinedMax?: number;
			inputMax?: number;
		};
		costUSD?: {
			totalUSD?: number | string;
			inputUSD?: number | string;
			outputUSD?: number | string;
			reasoningUSD?: number | string;
			cacheReadUSD?: number | string;
		};
	};
};

const _THOUSAND = 1000;
const _MILLION = 1_000_000;
const _BILLION = 1_000_000_000;
const PERCENT_MAX = 100;

// Lucide CircleIcon geometry
const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_RADIUS = 10;
const ICON_STROKE_WIDTH = 2;

type ContextIconProps = {
	percent: number; // 0 - 100
};

export const ContextIcon = ({ percent }: ContextIconProps) => {
	const radius = ICON_RADIUS;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - percent / PERCENT_MAX);

	return (
		<svg
			aria-label={`${percent.toFixed(2)}% of model context used`}
			height="28"
			role="img"
			style={{ color: 'currentcolor' }}
			viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
			width="28"
		>
			<circle
				cx={ICON_CENTER}
				cy={ICON_CENTER}
				fill="none"
				opacity="0.25"
				r={radius}
				stroke="currentColor"
				strokeWidth={ICON_STROKE_WIDTH}
			/>
			<circle
				cx={ICON_CENTER}
				cy={ICON_CENTER}
				fill="none"
				opacity="0.7"
				r={radius}
				stroke="currentColor"
				strokeDasharray={`${circumference} ${circumference}`}
				strokeDashoffset={dashOffset}
				strokeLinecap="round"
				strokeWidth={ICON_STROKE_WIDTH}
				transform={`rotate(-90 ${ICON_CENTER} ${ICON_CENTER})`}
			/>
		</svg>
	);
};

function formatCost(cost: number | string | undefined): string | null {
	if (cost === undefined || cost === null) return null;
	const numCost = typeof cost === 'string' ? Number.parseFloat(cost) : cost;
	if (Number.isNaN(numCost) || numCost === 0) return null;

	// Format based on magnitude
	if (numCost >= 0.01) {
		return `$${numCost.toFixed(4)}`;
	} else if (numCost >= 0.001) {
		return `$${numCost.toFixed(5)}`;
	} else {
		return `$${numCost.toFixed(6)}`;
	}
}

function InfoRow({
	label,
	tokens,
	costText,
}: {
	label: string;
	tokens?: number;
	costText?: string;
}) {
	const formattedCost = formatCost(costText);

	return (
		<div className="flex items-center justify-between text-xs">
			<span className="text-muted-foreground">{label}</span>
			<div className="flex items-center gap-2 font-mono">
				<span className="min-w-[4ch] text-right">
					{tokens === undefined ? '—' : tokens.toLocaleString()}
				</span>
				{formattedCost && <span className="text-muted-foreground">{formattedCost}</span>}
			</div>
		</div>
	);
}

export const Context = ({ className, usage, ...props }: ContextProps) => {
	const t = useTranslations('chat.usage');
	const used = usage?.totalTokens ?? 0;
	const max = usage?.context?.totalMax ?? usage?.context?.combinedMax ?? usage?.context?.inputMax;
	const hasMax = typeof max === 'number' && Number.isFinite(max) && max > 0;
	const usedPercent = hasMax ? Math.min(100, (used / max) * 100) : 0;
	const totalCost = formatCost(usage?.costUSD?.totalUSD);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className={cn(
						'inline-flex select-none items-center gap-1.5 rounded-md text-sm',
						'cursor-pointer bg-background text-foreground',
						'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none ring-offset-background',
						className
					)}
					type="button"
					{...props}
				>
					<span className="hidden font-medium text-muted-foreground">{usedPercent.toFixed(1)}%</span>
					<ContextIcon percent={usedPercent} />
					{totalCost && <span className="text-xs font-medium text-muted-foreground">{totalCost}</span>}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-fit p-3" side="top">
				<div className="min-w-[240px] space-y-2">
					<div className="flex items-start justify-between text-sm">
						<span>{usedPercent.toFixed(1)}%</span>
						<span className="text-muted-foreground">
							{hasMax ? `${used} / ${max} tokens` : `${used} tokens`}
						</span>
					</div>
					<div className="space-y-2">
						<Progress className="h-2 bg-muted" value={usedPercent} />
					</div>
					<div className="mt-1 space-y-1">
						{usage?.cachedInputTokens && usage.cachedInputTokens > 0 && (
							<InfoRow
								costText={usage?.costUSD?.cacheReadUSD?.toString()}
								label={t('cacheHits')}
								tokens={usage?.cachedInputTokens}
							/>
						)}
						<InfoRow
							costText={usage?.costUSD?.inputUSD?.toString()}
							label={t('input')}
							tokens={usage?.inputTokens}
						/>
						<InfoRow
							costText={usage?.costUSD?.outputUSD?.toString()}
							label={t('output')}
							tokens={usage?.outputTokens}
						/>
						<InfoRow
							costText={usage?.costUSD?.reasoningUSD?.toString()}
							label={t('reasoning')}
							tokens={
								usage?.reasoningTokens && usage.reasoningTokens > 0 ? usage.reasoningTokens : undefined
							}
						/>
						{usage?.costUSD?.totalUSD !== undefined && (
							<>
								<Separator className="mt-1" />
								<div className="flex items-center justify-between pt-1 text-xs font-semibold">
									<span className="text-foreground">{t('totalCost')}</span>
									<div className="flex items-center gap-2 font-mono">
										<span className="min-w-[4ch] text-right" />
										<span className="text-foreground">{formatCost(usage.costUSD.totalUSD) || '—'}</span>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
