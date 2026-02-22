'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { SwitchField } from '@/components/ui/switch-field';
import { productCollectionsService } from '@/lib/product-collections-service';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import { TemplateSelector } from './template-selector';
import type { ProductCollectionTemplate } from '@/lib/types';

interface NewProposalCollectionClientProps {
	organisationId: string;
	proposalId: string;
}

export function NewProposalCollectionClient({
	organisationId,
	proposalId,
}: NewProposalCollectionClientProps) {
	const tProducts = useTranslations('products');
	const tProposals = useTranslations('proposals');
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [templates, setTemplates] = useState<ProductCollectionTemplate[]>([]);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	// Track only the initialData passed to CrudForm; we'll update it when template changes
	const [initialData, setInitialData] = useState<Record<string, any>>({
		template: '',
		name: '',
		description: '',
		discount: '',
		discount_type: 'none',
		show_prices: true,
	});

	useEffect(() => {
		(async () => {
			try {
				const tpls = await productCollectionsService.getCollections(organisationId);
				setTemplates(tpls);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : tProducts('loadFailed'));
			} finally {
				setIsLoading(false);
			}
		})();
	}, [organisationId]);

	const fields: CrudFormField[] = [
		{
			name: 'template',
			label: tProducts('template'),
			type: 'select',
			required: false,
			placeholder: '—',
			options: templates.map((t) => ({ value: t.id, label: t.name })),
		},
		{
			name: 'name',
			label: tProducts('name'),
			type: 'text',
			required: true,
			placeholder: tProposals('collectionNamePlaceholder'),
		},
		{
			name: 'description',
			label: tProducts('description'),
			type: 'textarea',
			required: false,
			placeholder: tProposals('collectionDescriptionPlaceholder'),
		},
		{
			name: 'discount',
			label: tProducts('discount'),
			type: 'text',
			required: false,
			placeholder: 'e.g. 10 for 10% or 50 for €50',
		},
		{
			name: 'discount_type',
			label: tProducts('discountType'),
			type: 'select',
			required: false,
			options: [
				{ value: 'percent', label: 'Percentage (%)' },
				{ value: 'fixed', label: 'Fixed Amount (€)' },
				{ value: 'none', label: 'No Discount' },
			],
		},
		{
			name: 'show_prices',
			label: tProducts('showPrices'),
			type: 'custom',
			required: false,
			description: tProducts('showPricesDescription'),
			component: SwitchField,
			componentProps: { isSwitch: true },
			getValue: (data) => (data as Record<string, unknown>).show_prices !== false,
		},
	];

	const handleFieldChange = (name: string, value: any) => {
		if (name === 'template') {
			setSelectedTemplateId(value || null);
			const tpl = templates.find((t) => t.id === value);
			if (!tpl) {
				// Clear only the template selection, keep current values
				setInitialData((prev) => ({ ...prev, template: '' }));
				return;
			}

			const next: Record<string, any> = { ...initialData, template: value };
			if (!next.name || (typeof next.name === 'string' && next.name.trim() === '')) {
				next.name = tpl.name || '';
			}
			// Description is now a simple text field
			if (
				!next.description ||
				(typeof next.description === 'string' && next.description.trim() === '')
			) {
				next.description = tpl.description || '';
			}
			next.show_prices = tpl.show_prices !== false;

			setInitialData(next);
		}
	};

	const handleSubmit = async (data: any) => {
		setIsSaving(true);
		try {
			let collectionReference: string | null = null;
			let name = (data.name as string | undefined)?.trim();
			let description = data.description || '';
			if (selectedTemplateId) {
				const tpl = templates.find((t) => t.id === selectedTemplateId);
				if (tpl) {
					collectionReference = tpl.id;
					if (!name) name = tpl.name;
					if (!description) description = tpl.description || '';
					// Copy discount settings from template if not already set
					if (!data.discount && tpl.discount) {
						setInitialData((prev) => ({
							...prev,
							discount: tpl.discount,
							discount_type: tpl.discount_type || 'none',
						}));
					}
				}
			}
			if (!name) {
				toast.error(tProposals('nameRequired'), {
					style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
				});
				return;
			}

			const created = await productCollectionsInstancesService.createCollection({
				proposal_id: proposalId,
				collection_reference: collectionReference,
				name,
				description,
				discount: data.discount || null,
				discount_type: data.discount_type || null,
				organisation_id: organisationId,
				show_prices: data.show_prices !== false,
			} as any);

			if (collectionReference) {
				await productCollectionsInstancesService.copyItemsFromTemplate(
					created.id,
					collectionReference,
					organisationId
				);
			}

			toast.success(tProposals('collectionCreatedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
			router.push(`/dashboard/proposals/${proposalId}/collections/${created.id}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProposals('collectionCreateFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<CrudForm
				title={tProducts('createCollection')}
				description={tProducts('createNewCollection')}
				fields={fields}
				initialData={initialData}
				onSubmit={handleSubmit}
				onFieldChange={handleFieldChange}
				isLoading={isLoading}
				isSaving={isSaving}
				backHref={`/dashboard/proposals/${proposalId}`}
				entityType="product-collection"
				markDirtyOnInitialDataChange
			/>

			<div className="container pt-0 mx-auto p-6 h-full flex-1">
				<TemplateSelector
					organisationId={organisationId}
					proposalId={proposalId}
					templates={templates}
				/>
			</div>
		</div>
	);
}
