'use client';

import { Switch } from '@/components/ui/switch';

interface SwitchFieldProps {
	value?: boolean;
	onValueChange?: (checked: boolean) => void;
}

export function SwitchField({ value = false, onValueChange }: SwitchFieldProps) {
	return <Switch checked={value} onCheckedChange={onValueChange} />;
}
