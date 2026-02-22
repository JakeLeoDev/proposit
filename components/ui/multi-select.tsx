'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
	id: string;
	label: string;
	description?: string;
}

export interface MultiSelectProps {
	options: MultiSelectOption[];
	selected: string[];
	onSelectionChange: (selected: string[]) => void;
	placeholder?: string;
	triggerClassName?: string;
}

export function MultiSelect({
	options,
	selected,
	onSelectionChange,
	placeholder,
	triggerClassName,
}: MultiSelectProps) {
	const t = useTranslations('common');
	const [open, setOpen] = React.useState(false);
	const resolvedPlaceholder = placeholder ?? t('selectItems');

	const handleToggle = (optionId: string) => {
		const newSelected = selected.includes(optionId)
			? selected.filter((id) => id !== optionId)
			: [...selected, optionId];
		onSelectionChange(newSelected);
	};

	const handleSelectAll = () => {
		if (selected.length === options.length) {
			onSelectionChange([]);
		} else {
			onSelectionChange(options.map((opt) => opt.id));
		}
	};

	const selectedCount = selected.length;
	const displayText =
		selectedCount === 0
			? resolvedPlaceholder
			: selectedCount === options.length
				? t('allSelected')
				: t('nSelected', { count: selectedCount });

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className={cn('h-8 justify-between', triggerClassName)}>
					<span className="truncate text-sm">{displayText}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[280px]" align="start">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>{t('selectTools')}</span>
					<Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleSelectAll}>
						{selected.length === options.length ? t('deselectAll') : t('selectAll')}
					</Button>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<div className="max-h-[300px] overflow-y-auto">
					{options.map((option) => {
						const isSelected = selected.includes(option.id);
						return (
							<DropdownMenuItem
								key={option.id}
								onSelect={(e) => {
									e.preventDefault();
									handleToggle(option.id);
								}}
								className="cursor-pointer"
							>
								<div className="flex items-start gap-2 w-full">
									<div
										className={cn(
											'mt-0.5 flex h-4 w-4 items-center justify-center rounded border',
											isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
										)}
									>
										{isSelected && <Check className="h-3 w-3" />}
									</div>
									<div className="flex-1">
										<div className="text-sm font-medium">{option.label}</div>
										{option.description && (
											<div className="text-xs text-muted-foreground">{option.description}</div>
										)}
									</div>
								</div>
							</DropdownMenuItem>
						);
					})}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
