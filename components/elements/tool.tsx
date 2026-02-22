'use client';

import type { ToolUIPart } from 'ai';
import {
	CheckCircleIcon,
	ChevronDownIcon,
	CircleIcon,
	ClockIcon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
	<Collapsible className={cn('not-prose mb-4 w-full rounded-md border', className)} {...props} />
);

export type ToolHeaderProps = {
	type: ToolUIPart['type'];
	state: ToolUIPart['state'];
	errorText?: ToolUIPart['errorText'];
	output?: unknown;
	className?: string;
};

const getStatusBadge = (
	status: ToolUIPart['state'],
	errorText?: ToolUIPart['errorText'],
	output?: unknown
) => {
	// Check if there's an error - either via errorText or output.success === false
	const hasError =
		errorText ||
		(output &&
			typeof output === 'object' &&
			output !== null &&
			'success' in output &&
			(output as { success?: boolean }).success === false);

	// Determine effective status
	const effectiveStatus = status === 'output-available' && hasError ? 'failed' : status;

	const labels = {
		'input-streaming': 'Pending',
		'input-available': 'Running',
		'output-available': 'Completed',
		'output-error': 'Error',
		failed: 'Failed',
	} as const;

	const icons = {
		'input-streaming': <CircleIcon className="size-4 animate-pulse text-primary" />,
		'input-available': <ClockIcon className="size-4 animate-spin" />,
		'output-available': <CheckCircleIcon className="size-4 text-success-dark" />,
		'output-error': <XCircleIcon className="size-4 text-error-dark" />,
		failed: <XCircleIcon className="size-4 text-error-dark" />,
	} as const;

	return (
		<Badge
			className={cn(
				'flex items-center gap-1 rounded-full text-xs transition-all',
				status === 'input-streaming' && 'animate-pulse'
			)}
			variant="secondary"
		>
			{icons[effectiveStatus]}
			<span>{labels[effectiveStatus]}</span>
		</Badge>
	);
};

export const ToolHeader = ({
	className,
	type,
	state,
	errorText,
	output,
	...props
}: ToolHeaderProps) => (
	<CollapsibleTrigger
		className={cn('flex w-full min-w-0 items-center justify-between gap-2 p-3', className)}
		{...props}
	>
		<div className="flex min-w-0 flex-1 items-center gap-2">
			<WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
			<span className="truncate font-medium text-sm">{type}</span>
		</div>
		<div className="flex shrink-0 items-center gap-2">
			{getStatusBadge(state, errorText, output)}
			<ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
		</div>
	</CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
	<CollapsibleContent
		className={cn(
			'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in min-w-0',
			className
		)}
		{...props}
	/>
);

export type ToolInputProps = ComponentProps<'div'> & {
	input: ToolUIPart['input'];
};

function ToolInputLabel() {
	const t = useTranslations('editor');
	return (
		<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
			{t('parameters')}
		</h4>
	);
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
	<div className={cn('space-y-2 overflow-hidden p-4 min-w-0', className)} {...props}>
		<ToolInputLabel />
		<div className="min-w-0 rounded-md bg-muted/50">
			<CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
		</div>
	</div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
	output: ReactNode;
	errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
	if (!(output || errorText)) {
		return null;
	}

	return (
		<div className={cn('space-y-2 p-4 min-w-0', className)} {...props}>
			<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{errorText ? 'Error' : 'Result'}
			</h4>
			<div
				className={
					'min-w-0 overflow-x-auto rounded-md text-xs [&_table]:w-full bg-muted/50 text-foreground p-2 break-words'
				}
			>
				{errorText && <div className="break-words">{errorText}</div>}
				{output && <div className="min-w-0">{output}</div>}
			</div>
		</div>
	);
};
