'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable, type DataTableColumn } from '@/components/crud/data-table';
import type { ProductCollectionTemplate } from '@/lib/types';
import { useProductsStore } from '@/lib/stores/products.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function ProductsClient() {
	const t = useTranslations('navigation');
	const tProducts = useTranslations('products');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useProductsStore();
	const collections = useProductsStore((s) => s.items);
	const isLoading = useProductsStore((s) => s.isLoading);
	const error = useProductsStore((s) => s.error ?? null);

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
		router.push('/dashboard/products/new');
	};

	const handleDelete = async (collection: ProductCollectionTemplate) => {
		await store.remove(collection.id);
	};

	const columns: DataTableColumn<ProductCollectionTemplate>[] = [
		{ key: 'name', label: tProducts('name') },
		{ key: 'iternal_name', label: tProducts('internalName') },
		{
			key: 'created_at',
			label: tProducts('created'),
			render: (value) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('products')}
				description={tProducts('manageCollections')}
				data={collections}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={tProducts('createCollection')}
				emptyMessage={tProducts('noCollections')}
				hrefPrefix="/dashboard/products"
				searchKey="name"
				searchPlaceholder={tProducts('searchCollections')}
			/>
		</div>
	);
}
