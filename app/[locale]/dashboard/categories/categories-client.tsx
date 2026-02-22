'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import type { Category } from '@/lib/types';
import { useCategoriesStore } from '@/lib/stores/categories.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function CategoriesClient() {
	const t = useTranslations('navigation');
	const tCategories = useTranslations('categories');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useCategoriesStore();
	const categories = useCategoriesStore((s) => s.items);
	const isLoading = useCategoriesStore((s) => s.isLoading);
	const error = useCategoriesStore((s) => s.error ?? null);

	useEffect(() => {
		if (organisationId) {
			store.fetchAll(organisationId);
			const unsubscribe = store.startRealtime(organisationId);
			return () => {
				const r = unsubscribe();
				void r;
			};
		}
	}, [organisationId]); // Removed store from dependencies

	const handleCreate = () => {
		router.push('/dashboard/categories/new');
	};

	const handleDelete = async (category: Category) => {
		await store.remove(category.id);
	};

	const columns: DataTableColumn<Category>[] = [
		{
			key: 'name',
			label: tCategories('name'),
			render: (value, _item) => <div className="font-medium">{value}</div>,
		},
		{
			key: 'description',
			label: tCategories('description'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground truncate max-w-xs">{value}</div>
			),
		},
		{
			key: 'created_at',
			label: tCategories('created'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('categories')}
				description={tCategories('manageCategories')}
				data={categories}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={tCategories('createCategory')}
				emptyMessage={tCategories('noCategories')}
				hrefPrefix="/dashboard/categories"
				searchKey="name"
				searchPlaceholder={tCategories('searchCategories')}
			/>
		</div>
	);
}
