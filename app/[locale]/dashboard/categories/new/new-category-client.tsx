'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm } from '@/components/crud/crud-form';
import type { CrudFormField } from '@/components/crud/crud-form';
import { useCategoriesStore } from '@/lib/stores/categories.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import type { Category } from '@/lib/types';

export function NewCategoryClient() {
	const tCategories = useTranslations('categories');
	const tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useCategoriesStore();
	const isSaving = useCategoriesStore((s) => s.isSaving);

	const handleSubmit = async (formData: any) => {
		if (!organisationId) {
			toast.error(tCommon('organisationIdNotAvailable'));
			return;
		}

		try {
			const categoryData = {
				...formData,
				organisation_id: organisationId,
			};

			await store.create(categoryData);

			toast.success(tCategories('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to categories list after a short delay
			setTimeout(() => {
				router.push('/dashboard/categories');
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCategories('createFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: tCategories('name'),
			type: 'text',
			required: true,
			placeholder: tCategories('namePlaceholder'),
		},
		{
			name: 'description',
			label: tCategories('description'),
			type: 'textarea',
			required: false,
			placeholder: tCategories('descriptionPlaceholder'),
		},
	];

	// Provide default initial data with empty values
	const initialData: Partial<Category> = {
		name: '',
		description: '',
	};

	return (
		<CrudForm
			title={tCategories('createNewCategory')}
			description={tCategories('createNewCategory')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isSaving}
			backHref="/dashboard/categories"
			entityType="category"
		/>
	);
}
