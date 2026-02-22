'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm } from '@/components/crud/crud-form';
import type { CrudFormField } from '@/components/crud/crud-form';
import { useCategoriesStore } from '@/lib/stores/categories.store';
import type { Category } from '@/lib/types';

export function EditCategoryClient({ categoryId }: { categoryId: string }) {
	const tCategories = useTranslations('categories');
	const tCommon = useTranslations('common');
	const router = useRouter();
	const store = useCategoriesStore();
	const category = useCategoriesStore((s) => s.itemById[categoryId]);
	const isLoading = useCategoriesStore((s) => s.isLoading);
	const isSaving = useCategoriesStore((s) => s.isSaving);

	useEffect(() => {
		store.fetchOne(categoryId);
	}, [categoryId]); // Removed store from dependencies

	const handleSaveSuccess = (_data: Partial<Category>) => {
		// Data is automatically synced via store
	};

	const handleSubmit = async (formData: any) => {
		try {
			await store.update(categoryId, formData);

			toast.success(tCategories('updatedSuccessfully'), {
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
			toast.error(err instanceof Error ? err.message : tCategories('updateFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const handleDelete = async () => {
		try {
			await store.remove(categoryId);

			toast.success(tCategories('deletedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			router.push('/dashboard/categories');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCategories('deleteFailed'), {
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

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-4"></div>
						<p className="text-muted-foreground">{tCommon('loading')}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!category) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">{tCommon('error')}</h1>
					<p className="text-muted-foreground mb-4">Category not found</p>
					<button
						onClick={() => router.push('/dashboard/categories')}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						Back to Categories
					</button>
				</div>
			</div>
		);
	}

	return (
		<CrudForm
			title={tCategories('editCategory')}
			description={tCategories('editCategory')}
			fields={fields}
			initialData={category}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			onSaveSuccess={handleSaveSuccess}
			isLoading={false}
			isSaving={isSaving}
			isDeleting={false}
			backHref="/dashboard/categories"
			entityType="category"
			entityId={categoryId}
		/>
	);
}
