'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { AutocompleteServiceConfig } from '@/lib/types';

export interface AutocompleteOption {
	value: string;
	label: string;
}

export interface AutocompleteValue {
	id: string | null;
	value: string;
}

interface AutocompleteWithCreateProps<T = any> {
	serviceConfig: AutocompleteServiceConfig<T>;
	organisationId: string;
	value?: AutocompleteValue | string;
	onValueChange: (value: AutocompleteValue) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	dependencies?: Record<string, string>; // For dependent fields
}

export function AutocompleteWithCreate<T = any>({
	serviceConfig,
	organisationId,
	value,
	onValueChange,
	placeholder = 'Search...',
	disabled = false,
	className,
	dependencies,
}: AutocompleteWithCreateProps<T>) {
	const t = useTranslations('common');
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState('');
	const [options, setOptions] = React.useState<AutocompleteOption[]>([]);
	const [isLoading, setIsLoading] = React.useState(true);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);
	const previousDependenciesRef = React.useRef<Record<string, string> | undefined>(dependencies);

	// Normalize value to AutocompleteValue format
	const normalizedValue = React.useMemo((): AutocompleteValue => {
		if (!value) return { id: null, value: '' };
		if (typeof value === 'string') {
			// Legacy string value - treat as ID and fetch the entity
			return { id: value, value: '' };
		}
		return value;
	}, [value]);

	// Stringify dependencies for comparison (to detect actual changes)
	const dependenciesKey = React.useMemo(() => JSON.stringify(dependencies || {}), [dependencies]);

	// Clear value when dependencies change (because the current value might not be valid for new dependency context)
	React.useEffect(() => {
		const prevDepsKey = JSON.stringify(previousDependenciesRef.current || {});

		if (prevDepsKey !== dependenciesKey && normalizedValue.id) {
			// Dependencies changed and we have a value selected - clear it
			onValueChange({ id: null, value: '' });
		}

		previousDependenciesRef.current = dependencies;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dependenciesKey]); // Only re-run when the stringified key changes

	// Determine whether dependency IDs are present (undefined/empty means invalid deps)
	const areDependenciesValid = React.useMemo(() => {
		console.log(dependenciesKey);
		if (!dependencies || Object.keys(dependencies).length === 0) return true;
		console.log(dependencies);
		return Object.values(dependencies).every((val) => typeof val === 'string' && val.length > 0);
	}, [dependenciesKey]);

	// Load entities (refetch when dependencies change)
	React.useEffect(() => {
		const loadEntities = async () => {
			if (!organisationId) {
				setOptions([]);
				setIsLoading(false);
				return;
			}

			// If dependencies are provided, ensure all dependency values look like UUIDs (non-empty strings)
			if (!areDependenciesValid) {
				// Dependency not satisfied (e.g., a new company without an id) → clear options and skip fetching
				setOptions([]);
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				const entities = await serviceConfig.fetchAll(organisationId, dependencies);
				const mappedOptions = entities.map((entity) => ({
					value: serviceConfig.getIdField(entity),
					label: serviceConfig.getLabelField(entity),
				}));
				setOptions(mappedOptions);
			} catch (error) {
				toast.error(error instanceof Error ? error.message : t('loadFailed'));
			} finally {
				setIsLoading(false);
			}
		};

		loadEntities();

		// Subscribe to real-time updates (filtered by dependencies)
		const subscription = areDependenciesValid
			? serviceConfig.subscribe(
					organisationId,
					(payload) => {
						if (payload.eventType === 'INSERT') {
							const newEntity = payload.new as T;
							const newOption = {
								value: serviceConfig.getIdField(newEntity),
								label: serviceConfig.getLabelField(newEntity),
							};
							setOptions((prev) => [newOption, ...prev]);
						} else if (payload.eventType === 'UPDATE') {
							const updatedEntity = payload.new as T;
							const updatedOption = {
								value: serviceConfig.getIdField(updatedEntity),
								label: serviceConfig.getLabelField(updatedEntity),
							};
							setOptions((prev) =>
								prev.map((opt) => (opt.value === updatedOption.value ? updatedOption : opt))
							);
						} else if (payload.eventType === 'DELETE') {
							const deletedEntity = payload.old as T;
							const deletedId = serviceConfig.getIdField(deletedEntity);
							setOptions((prev) => prev.filter((opt) => opt.value !== deletedId));
						}
					},
					dependencies
				)
			: ({ unsubscribe: () => {} } as any);

		return () => {
			subscription.unsubscribe();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organisationId, serviceConfig, dependenciesKey, areDependenciesValid]); // Use dependenciesKey instead of dependencies object

	// Fetch display label when value is just an ID
	React.useEffect(() => {
		const fetchDisplayLabel = async () => {
			if (normalizedValue.id && !normalizedValue.value) {
				try {
					const entity = await serviceConfig.fetchById(normalizedValue.id);
					if (entity) {
						const label = serviceConfig.getLabelField(entity);
						// Update the value with the label
						onValueChange({ id: normalizedValue.id, value: label });
					}
				} catch {
					// Silently fail - the field will show the ID instead of label
					toast.error(t('loadFailed'));
				}
			}
		};

		fetchDisplayLabel();
	}, [normalizedValue.id, normalizedValue.value, serviceConfig, onValueChange]);

	// Get display label
	const displayValue = normalizedValue.value || '';

	// Filter options based on search
	const filteredOptions = React.useMemo(() => {
		if (!search) return options;
		return options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));
	}, [options, search]);

	// Handle click outside
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Update search when opening with existing value
	React.useEffect(() => {
		if (open && displayValue) {
			setSearch(displayValue);
		}
	}, [open, displayValue]);

	const handleSelect = (selectedValue: string) => {
		const option = options.find((o) => o.value === selectedValue);
		if (option) {
			onValueChange({ id: selectedValue, value: option.label });
		}
		setOpen(false);
		setSearch('');
	};

	const handleInputFocus = () => {
		setOpen(true);
		if (displayValue) {
			setSearch(displayValue);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setSearch(newValue);
		if (!open) setOpen(true);
	};

	const handleInputBlur = () => {
		// When user leaves the field, set the value (for free text input)
		setTimeout(() => {
			setOpen(false);
			// Only update if the search value changed and is not empty
			if (search && search !== displayValue) {
				// Check if it matches an existing option
				const matchingOption = options.find((o) => o.label.toLowerCase() === search.toLowerCase());
				if (matchingOption) {
					onValueChange({ id: matchingOption.value, value: matchingOption.label });
				} else {
					// New value - id is null
					onValueChange({ id: null, value: search });
				}
			}
		}, 200);
	};

	return (
		<div className={cn('relative', className)}>
			<div className="relative flex items-center gap-2">
				<Input
					ref={inputRef}
					type="text"
					placeholder={placeholder}
					value={open ? search : displayValue}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onBlur={handleInputBlur}
					disabled={disabled || isLoading}
					className="w-full"
				/>
				{normalizedValue.id === null && normalizedValue.value && (
					<Badge variant="secondary" className="absolute right-2 pointer-events-none">
						New
					</Badge>
				)}
			</div>
			{open && !disabled && filteredOptions.length > 0 && (
				<div
					ref={dropdownRef}
					className="absolute z-50 w-full mt-1 bg-popover border border-input rounded-md shadow-md max-h-60 overflow-auto"
				>
					{isLoading ? (
						<div className="p-2 text-sm text-muted-foreground text-center">Loading...</div>
					) : (
						<div className="py-1">
							{filteredOptions.map((option) => (
								<button
									key={option.value}
									onClick={() => handleSelect(option.value)}
									className={cn(
										'w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground cursor-pointer flex items-center justify-between',
										normalizedValue.id === option.value && 'bg-accent'
									)}
								>
									<span>{option.label}</span>
									{normalizedValue.id === option.value && <Check className="h-4 w-4" />}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
