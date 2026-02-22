'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Plus, ExternalLink } from 'lucide-react';
import { AuthenticatedImg } from '@/components/ui/authenticated-image';
import { AutocompleteWithCreate } from '@/components/ui/autocomplete-with-create';
import { SelectWithDropdown } from '@/components/ui/select-with-dropdown';
import type { AutocompleteServiceConfig } from '@/lib/types';
import type { AutocompleteValue } from '@/components/ui/autocomplete-with-create';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export interface CrudModalField {
	name: string;
	label: string;
	type:
		| 'text'
		| 'textarea'
		| 'richtext'
		| 'select'
		| 'autocomplete'
		| 'date'
		| 'file'
		| 'custom'
		| 'number';
	required?: boolean;
	placeholder?: string;
	description?: string;
	options?: { value: string; label: string }[];
	component?: React.ComponentType<any>;
	componentProps?: Record<string, any>;
	getValue?: (data: any) => any;
	// For autocomplete fields
	autocompleteService?: AutocompleteServiceConfig<any>;
	dependsOn?: string[]; // Field names this field depends on
}

export interface CrudModalProps<T> {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	title: string;
	description?: string;
	fields: CrudModalField[];
	initialData?: Partial<T>;
	onSubmit: (data: Partial<T>) => Promise<T>;
	onSuccess?: (data: T) => void;
	isLoading?: boolean;
	entityType?: string;
	entityId?: string;
	organisationId?: string;
	onFieldChange?: (name: string, value: any) => void;
	showSaveAndAddAnother?: boolean;
	navigationIcon?: React.ComponentType<any>;
	navigationHref?: string;
	onNavigationClick?: () => void;
}

// Topological sort for dependency resolution
function topologicalSort(graph: Map<string, string[]>): string[] {
	const visited = new Set<string>();
	const result: string[] = [];
	const visiting = new Set<string>();

	function visit(node: string) {
		if (visited.has(node)) return;
		if (visiting.has(node)) {
			throw new Error(`Circular dependency detected involving: ${node}`);
		}

		visiting.add(node);

		const dependencies = graph.get(node) || [];
		for (const dep of dependencies) {
			if (graph.has(dep)) {
				visit(dep);
			}
		}

		visiting.delete(node);
		visited.add(node);
		result.push(node);
	}

	// Visit all nodes
	for (const node of graph.keys()) {
		visit(node);
	}

	return result;
}

export function CrudModal<T extends Record<string, any>>({
	open,
	onOpenChange,
	mode,
	title,
	description,
	fields,
	initialData = {},
	onSubmit,
	onSuccess,
	isLoading = false,
	entityType: _entityType = 'entity',
	entityId: _entityId,
	organisationId,
	onFieldChange,
	showSaveAndAddAnother,
	navigationIcon,
	navigationHref,
	onNavigationClick,
}: CrudModalProps<T>) {
	const t = useTranslations('common');
	const tCrud = useTranslations('crud');
	const [formData, setFormData] = useState<Partial<T>>(initialData);
	const [localError, setLocalError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [autocompleteValues, setAutocompleteValues] = useState<Record<string, AutocompleteValue>>(
		{}
	);
	const initialMountRef = useRef(true);

	// Reset form when modal opens/closes or initial data changes
	useEffect(() => {
		if (open) {
			setFormData(initialData);
			setLocalError(null);
			setAutocompleteValues({});
			initialMountRef.current = true;
		}
	}, [open, initialData]);

	const handleInputChange = useCallback(
		(name: string, value: any) => {
			setFormData((prev) => ({
				...prev,
				[name]: value,
			}));
			setLocalError(null);

			// Notify parent
			onFieldChange?.(name, value);

			// Check if this is an autocomplete field
			const field = fields.find((f) => f.name === name);
			if (field?.type === 'autocomplete' && typeof value === 'object' && value !== null) {
				// Store the full AutocompleteValue object
				setAutocompleteValues((prev) => ({
					...prev,
					[name]: value,
				}));
			}
		},
		[onFieldChange, fields]
	);

	const handleSubmit = async (saveAndAddAnother = false) => {
		setLocalError(null);
		setIsSaving(true);

		try {
			// Build dependency graph for autocomplete fields
			const dependencyGraph: Map<string, string[]> = new Map();
			const autocompleteFields: CrudModalField[] = [];

			fields.forEach((field) => {
				if (field.type === 'autocomplete') {
					autocompleteFields.push(field);
					dependencyGraph.set(field.name, field.dependsOn || []);
				}
			});

			// Topological sort to determine creation order
			const creationOrder = topologicalSort(dependencyGraph);

			// Process autocomplete fields in dependency order
			const processedFormData = { ...formData };
			const createdEntities: Record<string, string> = {}; // Maps field name to created entity ID

			for (const fieldName of creationOrder) {
				const field = autocompleteFields.find((f) => f.name === fieldName);
				if (!field || !field.autocompleteService) continue;

				const autocompleteValue = autocompleteValues[fieldName];

				if (autocompleteValue?.id === null && autocompleteValue?.value) {
					// Need to create new entity
					// Gather dependencies (convert field names to dependency keys)
					const dependencies: Record<string, string> = {};
					field.dependsOn?.forEach((depField) => {
						// Use the created entity ID if available, otherwise use the form data value
						const depValue = createdEntities[depField] || (processedFormData as any)[depField];
						if (depValue) {
							// Store with the field name as the key
							dependencies[depField] = depValue;
						}
					});

					// Create the entity
					const newEntity = await field.autocompleteService.createMinimal(
						autocompleteValue.value,
						organisationId!,
						dependencies
					);

					const newId = field.autocompleteService.getIdField(newEntity);
					(processedFormData as any)[fieldName] = newId;
					createdEntities[fieldName] = newId;
				} else if (autocompleteValue?.id) {
					// Existing entity - just use the ID
					(processedFormData as any)[fieldName] = autocompleteValue.id;
				}
			}

			const result = await onSubmit(processedFormData);

			// Call success callback
			if (onSuccess) {
				onSuccess(result);
			}

			if (saveAndAddAnother) {
				setFormData({});
				setAutocompleteValues({});
				toast.success(mode === 'create' ? t('createdSuccessfully') : t('updatedSuccessfully'), {
					style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
				});
			} else {
				onOpenChange(false);
				toast.success(mode === 'create' ? t('createdSuccessfully') : t('updatedSuccessfully'), {
					style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
				});
			}
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : t('errorOccurred'));
			toast.error(err instanceof Error ? err.message : t('errorOccurred'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsSaving(false);
		}
	};

	const renderField = (field: CrudModalField) => {
		// Use getValue if provided, otherwise use direct field value
		const value = field.getValue ? field.getValue(formData) : (formData as any)[field.name];
		const isRequired = field.required;

		// Helper function to render field wrapper with description
		const renderFieldWrapper = (children: React.ReactNode) => (
			<div key={field.name} className="flex flex-col gap-2">
				<Label htmlFor={field.name}>
					{field.label}
					{isRequired && <span className="text-error ml-1">*</span>}
				</Label>
				{field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}
				{children}
			</div>
		);

		switch (field.type) {
			case 'file':
				let previewUrl: string | null = null;
				if (value instanceof File) {
					previewUrl = URL.createObjectURL(value);
				} else if (typeof value === 'string') {
					// Check if it's a full URL or a file path
					if (value.startsWith('http') || value.startsWith('/')) {
						previewUrl = value;
					} else {
						// It's a file path, use the path directly for AuthenticatedImg
						previewUrl = `Media/${value}`;
					}
				}
				return renderFieldWrapper(
					<>
						<Input
							id={field.name}
							type="file"
							accept="image/*"
							onChange={(e) => handleInputChange(field.name, e.target.files?.[0] || null)}
							required={isRequired}
						/>
						{previewUrl && (
							<AuthenticatedImg
								src={previewUrl}
								alt={`${field.label} preview`}
								className="h-16 mt-2 object-contain"
							/>
						)}
					</>
				);
			case 'textarea':
				return renderFieldWrapper(
					<Textarea
						id={field.name}
						value={(value as string) || ''}
						onChange={(e) => handleInputChange(field.name, e.target.value)}
						placeholder={field.placeholder}
						required={isRequired}
					/>
				);

			case 'richtext':
				if (field.component) {
					const RichTextComponent = field.component;

					// Handle rich text value - convert object to string for editor
					let richTextValue: any = value;
					if (typeof value === 'object' && value !== null) {
						richTextValue = JSON.stringify(value);
					}

					return renderFieldWrapper(
						<RichTextComponent
							key={field.name}
							value={richTextValue}
							onChange={(content: any) => handleInputChange(field.name, content)}
							placeholder={field.placeholder}
							{...(field.componentProps || {})}
						/>
					);
				}
				return null;

			case 'select':
				return renderFieldWrapper(
					<SelectWithDropdown
						options={field.options || []}
						value={(value as string) || ''}
						onValueChange={(newValue) => handleInputChange(field.name, newValue)}
						placeholder={field.placeholder || t('selectOption')}
						required={isRequired}
						disabled={isLoading || isSaving}
					/>
				);

			case 'autocomplete':
				if (!field.autocompleteService) return null;

				// Get dependency values for dependent fields
				const getDependenciesValues = (dependsOn?: string[]) => {
					if (!dependsOn) return undefined;
					const deps: Record<string, string> = {};
					dependsOn.forEach((depField) => {
						const rawValue = (formData as any)[depField];
						let resolvedId: string | null = null;
						// If the dependency field is an AutocompleteValue, use its id (may be null for new entity)
						if (rawValue && typeof rawValue === 'object' && 'id' in rawValue) {
							resolvedId = (rawValue as { id: string | null }).id;
						} else if (typeof rawValue === 'string') {
							resolvedId = rawValue || null;
						}

						// Always include the dependency key so child knows there is a dependency,
						// even if the id is not yet available (use empty string to signal unsatisfied)
						deps[depField] = resolvedId ?? '';
					});
					return deps;
				};

				return renderFieldWrapper(
					<AutocompleteWithCreate
						serviceConfig={field.autocompleteService}
						organisationId={organisationId || ''}
						value={autocompleteValues[field.name] || (value as any)}
						onValueChange={(autocompleteValue) => {
							handleInputChange(field.name, autocompleteValue);
						}}
						placeholder={field.placeholder}
						disabled={isLoading || isSaving}
						className="w-full"
						dependencies={getDependenciesValues(field.dependsOn)}
					/>
				);

			case 'date':
				return renderFieldWrapper(
					<Input
						id={field.name}
						type="date"
						value={(value as string) || ''}
						onChange={(e) => handleInputChange(field.name, e.target.value)}
						placeholder={field.placeholder}
						required={isRequired}
					/>
				);

			case 'number':
				return renderFieldWrapper(
					<Input
						id={field.name}
						type="number"
						value={value !== undefined && value !== null ? value : ''}
						onChange={(e) =>
							handleInputChange(field.name, e.target.value ? Number(e.target.value) : undefined)
						}
						placeholder={field.placeholder}
						required={isRequired}
						min="0"
						step="1"
					/>
				);

			case 'custom':
				if (field.component) {
					const CustomComponent = field.component;
					return renderFieldWrapper(
						<CustomComponent
							value={value}
							onValueChange={(newValue: any) => handleInputChange(field.name, newValue)}
							{...(field.componentProps || {})}
						/>
					);
				}
				return null;

			default: // text
				return renderFieldWrapper(
					<Input
						id={field.name}
						type="text"
						value={(value as string) || ''}
						onChange={(e) => handleInputChange(field.name, e.target.value)}
						placeholder={field.placeholder}
						required={isRequired}
					/>
				);
		}
	};

	const handleNavigationClick = () => {
		if (onNavigationClick) {
			onNavigationClick();
		} else if (navigationHref) {
			window.open(navigationHref, '_blank');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center gap-2">
						{(navigationIcon || navigationHref) && (
							<Button variant="ghost" size="sm" onClick={handleNavigationClick}>
								{navigationIcon ? (
									React.createElement(navigationIcon, { className: 'h-4 w-4' })
								) : (
									<ExternalLink className="h-4 w-4" />
								)}
							</Button>
						)}
						<div>
							<DialogTitle>{title}</DialogTitle>
							{description && <DialogDescription>{description}</DialogDescription>}
						</div>
					</div>
				</DialogHeader>

				{/* Error Alert */}
				{localError && (
					<Alert variant="destructive">
						<AlertDescription>{localError}</AlertDescription>
					</Alert>
				)}

				{/* Form */}
				<div className="space-y-4">{fields.map(renderField)}</div>

				<DialogFooter className="flex gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
						{tCrud('closeModal')}
					</Button>
					{(showSaveAndAddAnother ?? mode === 'create') && (
						<Button onClick={() => handleSubmit(true)} disabled={isSaving} variant="secondary">
							{isSaving ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Plus className="h-4 w-4 mr-2" />
							)}
							{tCrud('saveAndAddAnother')}
						</Button>
					)}
					<Button onClick={() => handleSubmit(false)} disabled={isSaving}>
						{isSaving ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Save className="h-4 w-4 mr-2" />
						)}
						{t('save')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
