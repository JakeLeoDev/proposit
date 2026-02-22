'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Circle, Trash2, Eye, ImageIcon, X } from 'lucide-react';
import Image from 'next/image';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { AutocompleteWithCreate } from '@/components/ui/autocomplete-with-create';
import { SelectWithDropdown } from '@/components/ui/select-with-dropdown';
import type { AutocompleteValue } from '@/components/ui/autocomplete-with-create';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { CrudFormField } from '@/components/crud/crud-form';
import type { Proposal } from '@/lib/types';

export interface ProposalFormProps {
	proposalId: string;
	organisationId: string;
	initialData: Partial<Proposal>;
	fields: CrudFormField[];
	tabs: { value: string; label: string }[];
	onSubmit: (data: Partial<Proposal>) => Promise<void>;
	onDelete?: () => Promise<void>;
	onPreview?: () => void;
	onFieldChange?: (name: string, value: any) => void;
	title?: ReactNode;
	description?: string;
	headerActions?: ReactNode;
	isLoading?: boolean;
	isSaving?: boolean;
	isDeleting?: boolean;
	customTabContent?: Record<string, ReactNode>;
	renderAfterFields?: (tabValue: string) => ReactNode;
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

export function ProposalForm({
	proposalId: _proposalId,
	organisationId,
	initialData,
	fields,
	tabs,
	onSubmit,
	onDelete,
	onPreview,
	onFieldChange,
	title,
	description,
	headerActions,
	isLoading = false,
	isSaving = false,
	isDeleting = false,
	customTabContent = {},
	renderAfterFields,
}: ProposalFormProps) {
	const t = useTranslations('common');
	const [formData, setFormData] = useState<Partial<Proposal>>(initialData);
	const [localError, setLocalError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [currentInitialData, setCurrentInitialData] = useState<Partial<Proposal>>(initialData);
	const [manualDirty, setManualDirty] = useState(false);
	const [autocompleteValues, setAutocompleteValues] = useState<Record<string, AutocompleteValue>>(
		{}
	);
	const initialMountRef = useRef(true);

	// Reset form only when the entity or initial data changes
	useEffect(() => {
		setFormData(initialData);
		setCurrentInitialData(initialData);

		// Initialize autocomplete values for existing data
		const newAutocompleteValues: Record<string, AutocompleteValue> = {};
		fields.forEach((field) => {
			if (field.type === 'autocomplete' && initialData[field.name as keyof Proposal]) {
				const entityId = initialData[field.name as keyof Proposal] as string;
				if (entityId) {
					newAutocompleteValues[field.name] = { id: entityId, value: '' };
				}
			}
		});
		setAutocompleteValues(newAutocompleteValues);

		if (initialMountRef.current) {
			setHasChanges(false);
			initialMountRef.current = false;
		}
	}, [initialData, fields]);

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
		[formData, onFieldChange, fields]
	);

	// Check for changes by comparing current form data with initial data
	useEffect(() => {
		const hasFormChanges = Object.keys(formData).some((key) => {
			const currentValue = (formData as any)[key];
			const initialValue = (currentInitialData as any)[key];

			// Find the field to check if it's an autocomplete
			const field = fields.find((f) => f.name === key);

			// Special handling for autocomplete fields
			if (field?.type === 'autocomplete') {
				const autocompleteValue = autocompleteValues[key];
				// Compare the ID from autocomplete value with initial ID
				// If autocomplete value is not set yet, use the current value from formData
				const currentId =
					autocompleteValue?.id ?? (typeof currentValue === 'string' ? currentValue : null);
				const initialId = typeof initialValue === 'string' ? initialValue : null;
				return currentId !== initialId;
			}

			// Handle different data types for non-autocomplete fields
			if (typeof currentValue === 'string' && typeof initialValue === 'string') {
				return currentValue !== initialValue;
			}

			// For objects (like rich text content), compare JSON strings
			if (typeof currentValue === 'object' && typeof initialValue === 'object') {
				return JSON.stringify(currentValue) !== JSON.stringify(initialValue);
			}

			return currentValue !== initialValue;
		});

		setHasChanges(hasFormChanges || manualDirty);
	}, [formData, currentInitialData, manualDirty, autocompleteValues, fields]);

	const executeDelete = async () => {
		if (!onDelete) return;
		try {
			await onDelete();
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLocalError(null);

		try {
			// Build dependency graph for autocomplete fields
			const dependencyGraph: Map<string, string[]> = new Map();
			const autocompleteFields: CrudFormField[] = [];

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
						organisationId,
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

			await onSubmit(processedFormData);
			// Update the initial data to reflect the saved state
			setCurrentInitialData(processedFormData);

			// Update autocomplete values with the final IDs
			const updatedAutocompleteValues: Record<string, AutocompleteValue> = {};
			autocompleteFields.forEach((field) => {
				const fieldValue = (processedFormData as any)[field.name];
				if (fieldValue) {
					// Keep the existing label but update the ID
					const existingValue = autocompleteValues[field.name];
					updatedAutocompleteValues[field.name] = {
						id: fieldValue,
						value: existingValue?.value || '',
					};
				}
			});
			setAutocompleteValues((prev) => ({ ...prev, ...updatedAutocompleteValues }));

			setHasChanges(false);
			setManualDirty(false);
		} catch (err) {
			setLocalError(err instanceof Error ? err.message : 'An error occurred');
		}
	};

	const renderField = (field: CrudFormField) => {
		// Use getValue if provided, otherwise use direct field value
		const value = field.getValue ? field.getValue(formData) : (formData as any)[field.name];
		const isRequired = field.required;

		// Helper function to render field wrapper with description
		const renderFieldWrapper = (children: React.ReactNode) => (
			<div key={field.name} className="flex flex-col gap-2.5">
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
				} else if (typeof value === 'string' && value) {
					// Check if it's a full URL or a file path
					if (value.startsWith('http') || value.startsWith('/')) {
						previewUrl = value;
					} else {
						// It's a file path, use the path directly for AuthenticatedImage
						previewUrl = `Media/${value}`;
					}
				}
				return renderFieldWrapper(
					<>
						{previewUrl ? (
							<div className="space-y-4">
								<div className="flex flex-col items-center justify-center space-y-4 p-6 border-2 border-dashed rounded-lg bg-muted/10">
									<div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-background shadow-sm">
										{value instanceof File ? (
											<Image
												src={previewUrl}
												alt={`${field.label} preview`}
												fill
												className="object-contain p-4"
											/>
										) : (
											<AuthenticatedImage
												src={previewUrl}
												alt={`${field.label} preview`}
												fill
												className="object-contain p-4"
											/>
										)}
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											handleInputChange(field.name, null);
											const input = document.getElementById(field.name) as HTMLInputElement;
											if (input) input.value = '';
										}}
									>
										<X className="h-4 w-4 mr-2" />
										{t('remove')}
									</Button>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<div className="flex flex-col items-center justify-center space-y-3 p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer bg-muted/10">
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
										<ImageIcon className="h-8 w-8 text-muted-foreground" />
									</div>
									<div className="text-center space-y-1">
										<p className="text-sm font-medium">{t('uploadFile')}</p>
										<p className="text-xs text-muted-foreground">PNG, JPG, or SVG up to 10MB</p>
									</div>
									<Input
										id={field.name}
										type="file"
										accept="image/*"
										onChange={(e) => handleInputChange(field.name, e.target.files?.[0] || null)}
										required={isRequired}
										className="hidden"
									/>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onClick={() => document.getElementById(field.name)?.click()}
									>
										{t('selectFile')}
									</Button>
								</div>
							</div>
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
							topSpacing={73} // 73px is the height of the toolbar
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
						placeholder={field.placeholder || 'Select an option'}
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
						organisationId={organisationId}
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	// Determine change indicator
	const getChangeIndicator = () => {
		if (hasChanges) {
			return (
				<Badge variant="secondary" className="flex items-center gap-1">
					<Circle className="h-2 w-2 fill-warning text-warning" />
					Unsaved changes
				</Badge>
			);
		} else if (isSaving) {
			return (
				<Badge variant="secondary" className="flex items-center gap-1">
					<Loader2 className="h-3 w-3 animate-spin" />
					Saving...
				</Badge>
			);
		} else {
			return (
				<Badge variant="outline" className="flex items-center gap-1">
					<Circle className="h-2 w-2 fill-success text-success" />
					Saved
				</Badge>
			);
		}
	};

	const defaultTab = tabs[0]?.value;
	const fieldsByTab = fields.reduce(
		(acc, field) => {
			const tabValue = field.tab || defaultTab || 'default';
			acc[tabValue] = acc[tabValue] || [];
			acc[tabValue].push(field);
			return acc;
		},
		{} as Record<string, CrudFormField[]>
	);

	return (
		<div className="space-y-6">
			{/* Header with title and action buttons */}
			{(title || description) && (
				<div className="flex items-center justify-between w-full px-6 mb-2">
					<div className="flex flex-col items-start gap-1">
						<div className="flex items-center gap-3">
							{title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
						</div>
						{description && <p className="text-muted-foreground">{description}</p>}
					</div>
					<div className="flex items-center gap-2">
						{onPreview && (
							<Button variant="outline" size="sm" onClick={onPreview} type="button">
								<Eye className="h-4 w-4 mr-2" />
								{t('preview')}
							</Button>
						)}
						{onDelete && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" size="sm" disabled={isDeleting}>
										{isDeleting ? (
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										) : (
											<Trash2 className="h-4 w-4 mr-2" />
										)}
										{t('delete')}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{t('delete')}?</AlertDialogTitle>
										<AlertDialogDescription>
											Sind Sie sicher, dass Sie dieses Angebot löschen möchten? Diese Aktion kann nicht
											rückgängig gemacht werden.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
										<AlertDialogAction onClick={executeDelete}>{t('delete')}</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
					</div>
				</div>
			)}

			<Tabs defaultValue={defaultTab}>
				{/* Sticky Tabs Header */}
				<div className="sticky top-0 z-10 bg-background border-b mb-6 px-6">
					<div className="flex items-center justify-between py-4">
						<TabsList>
							{tabs.map((tab) => (
								<TabsTrigger key={tab.value} value={tab.value}>
									{tab.label}
								</TabsTrigger>
							))}
						</TabsList>
						<div className="flex items-center gap-3">
							{getChangeIndicator()}
							{headerActions}
							<Button
								type="button"
								onClick={() => {
									const form = document.getElementById('proposal-form') as HTMLFormElement;
									if (form) {
										form.requestSubmit();
									}
								}}
								disabled={isSaving || !hasChanges}
							>
								{isSaving ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Save className="h-4 w-4 mr-2" />
								)}
								{t('save')}
							</Button>
						</div>
					</div>
				</div>

				{/* Error Alert */}
				{localError && (
					<Alert variant="destructive" className="mx-6">
						<AlertDescription>{localError}</AlertDescription>
					</Alert>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-6" id="proposal-form">
					{tabs.map((tab) => (
						<TabsContent key={tab.value} value={tab.value} className="px-6 mt-0">
							<div className="space-y-6">
								{/* Custom tab content or fields */}
								{customTabContent[tab.value] ? (
									customTabContent[tab.value]
								) : (
									<div className="grid gap-6">{(fieldsByTab[tab.value] || []).map(renderField)}</div>
								)}

								{/* Render additional content after fields */}
								{renderAfterFields && renderAfterFields(tab.value)}
							</div>
						</TabsContent>
					))}

					{/* Hidden submit button - form submits on Enter */}
					<button type="submit" style={{ display: 'none' }} aria-hidden="true" />
				</form>
			</Tabs>
		</div>
	);
}
