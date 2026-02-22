'use client';

import { ColorPicker } from './color-picker';

interface ColorPickerFieldProps {
	value?: string | null;
	onValueChange?: (value: string | null) => void;
	disabled?: boolean;
}

export function ColorPickerField({ value, onValueChange, disabled }: ColorPickerFieldProps) {
	return (
		<ColorPicker value={value} onValueChange={onValueChange || (() => {})} disabled={disabled} />
	);
}
