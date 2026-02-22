'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface SelectOption {
	value: string;
	label: string;
}

interface SelectWithDropdownProps {
	options: SelectOption[];
	value?: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	className?: string;
}

export function SelectWithDropdown({
	options,
	value = '',
	onValueChange,
	placeholder,
	disabled = false,
	required: _required = false,
	className,
}: SelectWithDropdownProps) {
	const t = useTranslations('common');
	const [open, setOpen] = React.useState(false);
	const resolvedPlaceholder = placeholder ?? t('selectOption');
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	// Get display label for selected value
	const displayValue = React.useMemo(() => {
		const selectedOption = options.find((opt) => opt.value === value);
		return selectedOption?.label || resolvedPlaceholder;
	}, [value, options, resolvedPlaceholder]);

	// Handle click outside
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				triggerRef.current &&
				!triggerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Handle keyboard navigation
	React.useEffect(() => {
		if (!open) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setOpen(false);
				triggerRef.current?.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [open]);

	const handleSelect = (selectedValue: string) => {
		onValueChange(selectedValue);
		setOpen(false);
		triggerRef.current?.focus();
	};

	const handleTriggerClick = () => {
		if (!disabled) {
			setOpen(!open);
		}
	};

	return (
		<div className={cn('relative', className)}>
			<button
				ref={triggerRef}
				type="button"
				onClick={handleTriggerClick}
				disabled={disabled}
				className={cn(
					'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
					'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
					'disabled:cursor-not-allowed disabled:opacity-50',
					!value && 'text-muted-foreground'
				)}
			>
				<span className="truncate">{displayValue}</span>
				<ChevronDown
					className={cn('h-4 w-4 opacity-50 transition-transform', open && 'transform rotate-180')}
				/>
			</button>
			{open && !disabled && (
				<div
					ref={dropdownRef}
					className="absolute z-50 w-full mt-1 bg-popover border border-input rounded-md shadow-md max-h-60 overflow-auto"
				>
					{options.length === 0 ? (
						<div className="p-2 text-sm text-muted-foreground text-center">{t('noOptionsAvailable')}</div>
					) : (
						<div className="py-1">
							{options.map((option) => (
								<button
									key={option.value}
									onClick={() => handleSelect(option.value)}
									type="button"
									className={cn(
										'w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between',
										value === option.value && 'bg-accent'
									)}
								>
									<span>{option.label}</span>
									{value === option.value && <Check className="h-4 w-4" />}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
