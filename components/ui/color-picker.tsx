'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';

interface ColorPickerProps {
	value?: string | null;
	onValueChange: (value: string | null) => void;
	disabled?: boolean;
	className?: string;
}

const PRESET_COLORS = [
	'#006cff', // Primary blue
	'#3b82f6', // Blue
	'#8b5cf6', // Purple
	'#ec4899', // Pink
	'#ef4444', // Red
	'#f59e0b', // Amber
	'#10b981', // Green
	'#06b6d4', // Cyan
	'#6366f1', // Indigo
	'#14b8a6', // Teal
	'#f97316', // Orange
	'#84cc16', // Lime
];

export function ColorPicker({ value, onValueChange, disabled, className }: ColorPickerProps) {
	const t = useTranslations('editor');
	const [isOpen, setIsOpen] = useState(false);
	const [hexValue, setHexValue] = useState(value || '');

	useEffect(() => {
		setHexValue(value || '');
	}, [value]);

	const handleColorChange = (newColor: string) => {
		setHexValue(newColor);
		onValueChange(newColor || null);
	};

	const handlePresetClick = (color: string) => {
		handleColorChange(color);
		setIsOpen(false);
	};

	const handleClear = () => {
		handleColorChange('');
		setIsOpen(false);
	};

	const isValidHex = (hex: string) => {
		return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
	};

	const displayColor = hexValue && isValidHex(hexValue) ? hexValue : '#006cff';

	return (
		<div className={cn('flex flex-col gap-2', className)}>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						disabled={disabled}
						className="w-full justify-start h-10 px-3"
					>
						<div className="flex items-center gap-3 w-full">
							<div
								className="h-5 w-5 rounded border border-border shrink-0"
								style={{ backgroundColor: displayColor }}
							/>
							<span className="flex-1 text-left text-sm">{hexValue || t('noColorSelected')}</span>
							<Palette className="h-4 w-4 text-muted-foreground shrink-0" />
						</div>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80 p-4" align="start">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-sm font-medium">{t('selectColor')}</Label>
							<div className="flex items-center gap-2">
								<div
									className="h-10 w-10 rounded border border-border shrink-0"
									style={{ backgroundColor: displayColor }}
								/>
								<Input
									type="text"
									value={hexValue}
									onChange={(e) => {
										const newValue = e.target.value;
										setHexValue(newValue);
										if (isValidHex(newValue)) {
											onValueChange(newValue || null);
										}
									}}
									placeholder="#006cff"
									className="flex-1 font-mono text-sm"
									maxLength={7}
								/>
							</div>
							<p className="text-xs text-muted-foreground">{t('hexColorHint')}</p>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium">{t('predefinedColors')}</Label>
							<div className="grid grid-cols-6 gap-2">
								{PRESET_COLORS.map((color) => (
									<button
										key={color}
										type="button"
										onClick={() => handlePresetClick(color)}
										className={cn(
											'h-8 w-8 rounded border-2 transition-all hover:scale-110',
											hexValue === color ? 'border-foreground' : 'border-border'
										)}
										style={{ backgroundColor: color }}
										aria-label={`Select color ${color}`}
									>
										{hexValue === color && <Check className="h-4 w-4 text-white m-auto drop-shadow-md" />}
									</button>
								))}
							</div>
						</div>

						<div className="flex justify-end pt-2 border-t">
							<Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!hexValue}>
								{t('removeColor')}
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
