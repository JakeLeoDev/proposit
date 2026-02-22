'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { productCollectionsService } from '@/lib/product-collections-service';
import { categoryAutocompleteConfig } from '@/lib/autocomplete-service-configs';
import type { ProductCollectionTemplate } from '@/lib/types';

interface NewProductCollectionClientProps {
	organisationId: string;
}

export function NewProductCollectionClient({ organisationId }: NewProductCollectionClientProps) {
	const tProducts = useTranslations('products');
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (data: Partial<ProductCollectionTemplate>) => {
		setIsLoading(true);
		try {
			const created = await productCollectionsService.createCollection({
				name: data.name || '',
				iternal_name: data.iternal_name || null,
				category: data.category || '',
				internal_notes: data.internal_notes || null,
				description: data.description || null,
				organisation_id: organisationId,
			});

			toast.success(tProducts('createdSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
			setTimeout(() => router.push(`/dashboard/products/${created.id}`), 1200);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProducts('createFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsLoading(false);
		}
	};

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: tProducts('name'),
			type: 'text',
			required: true,
			placeholder: tProducts('namePlaceholder'),
		},
		{
			name: 'iternal_name',
			label: tProducts('internalName'),
			type: 'text',
			required: false,
			placeholder: tProducts('internalNamePlaceholder'),
		},
		{
			name: 'category',
			label: tProducts('category'),
			type: 'autocomplete',
			required: true,
			autocompleteService: categoryAutocompleteConfig,
			placeholder: tProducts('selectCategory'),
		},
		{
			name: 'internal_notes',
			label: tProducts('internalNotes'),
			type: 'textarea',
			required: false,
			placeholder: tProducts('internalNotesPlaceholder'),
		},
		{
			name: 'description',
			label: tProducts('description'),
			type: 'textarea',
			required: false,
			placeholder: tProducts('descriptionPlaceholder'),
		},
	];

	const initialData: Partial<ProductCollectionTemplate> = {
		name: '',
		iternal_name: null,
		category: '',
		internal_notes: null,
		description: null,
	};

	return (
		<CrudForm
			title={tProducts('createCollection')}
			description={tProducts('createNewCollection')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isLoading}
			backHref="/dashboard/products"
			entityType="product-collection"
			organisationId={organisationId}
		/>
	);
}
