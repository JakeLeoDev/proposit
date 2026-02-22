'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { CrudModal, type CrudModalField } from '@/components/crud/crud-modal';
import { CompactList } from '@/components/crud/compact-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { productCollectionsService } from '@/lib/product-collections-service';
import { productItemsService } from '@/lib/product-items-service';
import { categoryAutocompleteConfig } from '@/lib/autocomplete-service-configs';
import { SwitchField } from '@/components/ui/switch-field';
import type { ProductCollectionTemplate, ProductItemTemplate } from '@/lib/types';

interface EditProductCollectionClientProps {
	collectionId: string;
	organisationId: string;
}

export function EditProductCollectionClient({
	collectionId,
	organisationId,
}: EditProductCollectionClientProps) {
	const tProducts = useTranslations('products');
	const router = useRouter();
	const [collection, setCollection] = useState<ProductCollectionTemplate | null>(null);
	const [items, setItems] = useState<ProductItemTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ProductItemTemplate | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const [c, its] = await Promise.all([
					productCollectionsService.getCollection(collectionId),
					productItemsService.getItemsByCollection(collectionId),
				]);
				if (!c) {
					toast.error(tProducts('notFound'), {
						style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
					});
					return;
				}
				setCollection(c);
				setItems(its);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : tProducts('loadFailed'), {
					style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
				});
			} finally {
				setIsLoading(false);
			}
		};

		load();

		const colSub = productCollectionsService.subscribeToCollection(collectionId, (payload) => {
			if (payload.eventType === 'UPDATE') {
				setCollection(payload.new);
			}
		});
		const itemsSub = productItemsService.subscribeToItemsByCollection(collectionId, (payload) => {
			if (payload.eventType === 'INSERT') {
				setItems((prev) => [payload.new, ...prev]);
			} else if (payload.eventType === 'UPDATE') {
				setItems((prev) => prev.map((i) => (i.id === payload.new.id ? payload.new : i)));
			} else if (payload.eventType === 'DELETE') {
				setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
			}
		});

		return () => {
			colSub.unsubscribe();
			itemsSub.unsubscribe();
		};
	}, [collectionId]);

	const handleSubmit = async (data: Partial<ProductCollectionTemplate>) => {
		setIsSaving(true);
		try {
			await productCollectionsService.updateCollection(collectionId, {
				name: data.name || '',
				iternal_name: data.iternal_name || '',
				category: data.category || '',
				internal_notes: (data.internal_notes as string) || null,
				description: data.description || null,
				show_prices: data.show_prices !== false,
			});
			toast.success(tProducts('updatedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProducts('updateFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await productCollectionsService.deleteCollection(collectionId);
			toast.success(tProducts('deletedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
			router.push('/dashboard/products');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProducts('deleteFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
			setIsDeleting(false);
		}
	};

	const handleAddItem = () => {
		setEditingItem(null);
		setIsModalOpen(true);
	};

	const handleEditItem = (item: ProductItemTemplate) => {
		setEditingItem(item);
		setIsModalOpen(true);
	};

	const handleModalSuccess = (item: ProductItemTemplate) => {
		if (editingItem) {
			// Update existing item
			setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
		} else {
			// Add new item
			setItems((prev) => [item, ...prev]);
		}
	};

	const handleCreateItem = async (data: Partial<ProductItemTemplate>) => {
		return await productItemsService.createItem({
			collection_id: collectionId,
			name: data.name || '',
			iternal_name: data.iternal_name || '',
			description: data.description || '',
			internal_notes: data.internal_notes || '',
			unit_price: Number(data.unit_price) || 0,
			unit_type: data.unit_type || '',
			organisation_id: organisationId,
		} as Omit<ProductItemTemplate, 'id' | 'created_at' | 'position'>);
	};

	const handleUpdateItem = async (data: Partial<ProductItemTemplate>) => {
		if (!editingItem) throw new Error('No item to update');
		return await productItemsService.updateItem(editingItem.id, {
			name: data.name || '',
			iternal_name: data.iternal_name || '',
			description: data.description || '',
			internal_notes: data.internal_notes || '',
			unit_price: Number(data.unit_price) || 0,
			unit_type: data.unit_type || '',
		});
	};

	const handleDeleteItem = async (item: ProductItemTemplate) => {
		// Optimistic update: Remove item from state immediately
		setItems((prev) => prev.filter((i) => i.id !== item.id));

		try {
			await productItemsService.deleteItem(item.id);
			toast.success(tProducts('itemDeletedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			// Rollback on error: Re-add the item if deletion failed
			setItems((prev) => [...prev, item].sort((a, b) => a.position - b.position));
			toast.error(err instanceof Error ? err.message : tProducts('itemDeleteFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		}
	};

	const handleReorderItems = async (reorderedItems: ProductItemTemplate[]) => {
		try {
			// Calculate new positions using decimal positioning
			const updates = reorderedItems.map((item, index) => {
				let newPosition: number;

				if (index === 0) {
					// First item: position 500 (half of default 1000)
					newPosition = 500;
				} else if (index === reorderedItems.length - 1) {
					// Last item: position of previous item + 1000
					const prevItem = reorderedItems[index - 1];
					newPosition = prevItem.position + 1000;
				} else {
					// Middle item: position between previous and next
					const prevItem = reorderedItems[index - 1];
					const nextItem = reorderedItems[index + 1];
					newPosition = (prevItem.position + nextItem.position) / 2;
				}

				return { id: item.id, position: newPosition };
			});

			// Update all positions in parallel
			await Promise.all(
				updates.map((update) => productItemsService.updateItemPosition(update.id, update.position))
			);

			// Update local state
			setItems(
				reorderedItems.map((item, index) => ({
					...item,
					position: updates[index].position,
				}))
			);

			toast.success(tProducts('itemsReorderedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProducts('itemsReorderFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
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
		{
			name: 'show_prices',
			label: tProducts('showPrices'),
			type: 'custom',
			required: false,
			description: tProducts('showPricesDescription'),
			component: SwitchField,
			componentProps: { isSwitch: true },
			getValue: (data) => (data as ProductCollectionTemplate).show_prices !== false,
		},
	];

	const itemFields: CrudModalField[] = [
		{
			name: 'name',
			label: tProducts('itemName'),
			type: 'text',
			required: true,
			placeholder: tProducts('itemNamePlaceholder'),
		},
		{
			name: 'iternal_name',
			label: tProducts('internalName'),
			type: 'text',
			required: false,
			placeholder: tProducts('internalNamePlaceholder'),
		},
		{
			name: 'description',
			label: tProducts('description'),
			type: 'textarea',
			required: false,
			placeholder: tProducts('itemDescriptionPlaceholder'),
		},
		{
			name: 'internal_notes',
			label: tProducts('internalNotes'),
			type: 'textarea',
			required: false,
			placeholder: tProducts('internalNotesPlaceholder'),
		},
		{
			name: 'unit_type',
			label: tProducts('unitType'),
			type: 'text',
			required: true,
			placeholder: 'e.g. piece, hour',
		},
		{
			name: 'unit_price',
			label: tProducts('unitPrice'),
			type: 'number',
			required: true,
			placeholder: 'e.g. 100',
		},
	];

	const renderItem = (item: ProductItemTemplate) => ({
		id: item.id,
		title: item.name,
		subtitle: `${item.unit_type} • €${item.unit_price}`,
		description: item.description || undefined,
	});

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-neutral-200 rounded w-1/4"></div>
					<div className="h-4 bg-neutral-200 rounded w-1/2"></div>
					<div className="h-64 bg-neutral-200 rounded"></div>
				</div>
			</div>
		);
	}

	if (!collection) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Collection not found</h1>
					<Button onClick={() => router.push('/dashboard/products')} className="mt-4">
						Back to Products
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1">
				<CrudForm
					title={tProducts('editCollection')}
					description={tProducts('editCollection')}
					fields={fields}
					initialData={collection}
					onSubmit={handleSubmit}
					onDelete={handleDelete}
					isLoading={isLoading}
					isSaving={isSaving}
					isDeleting={isDeleting}
					backHref="/dashboard/products"
					entityType="product-collection"
					entityId={collectionId}
					organisationId={organisationId}
				/>
			</div>

			<div className="container mx-auto p-6">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Package className="w-5 h-5" />
									{tProducts('items')}
								</CardTitle>
								<CardDescription>{tProducts('manageItemsFor', { name: collection.name })}</CardDescription>
							</div>
							<Button onClick={handleAddItem} size="sm">
								<Plus className="w-4 h-4 mr-2" />
								{tProducts('addItem')}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<CompactList
							data={items}
							renderItem={renderItem}
							onEdit={handleEditItem}
							onDelete={handleDeleteItem}
							isLoading={false}
							emptyMessage={tProducts('noItems')}
							searchKey="name"
							searchPlaceholder={tProducts('searchItems')}
							showSearch={false}
							sortable={true}
							onReorder={handleReorderItems}
						/>
					</CardContent>
				</Card>
			</div>

			{/* Item Modal */}
			<CrudModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				mode={editingItem ? 'edit' : 'create'}
				title={editingItem ? tProducts('editItem') : tProducts('createItem')}
				description={editingItem ? tProducts('editItem') : tProducts('createNewItem')}
				fields={itemFields}
				initialData={editingItem || { unit_price: 0 }}
				onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
				onSuccess={handleModalSuccess}
				entityType="product-item"
				entityId={editingItem?.id}
				organisationId={organisationId}
			/>
		</div>
	);
}
