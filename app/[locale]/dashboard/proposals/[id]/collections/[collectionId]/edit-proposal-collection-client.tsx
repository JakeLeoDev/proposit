'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { SwitchField } from '@/components/ui/switch-field';
import { CrudModal, type CrudModalField } from '@/components/crud/crud-modal';
import { CompactList } from '@/components/crud/compact-list';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileDown } from 'lucide-react';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import { productItemsInstancesService } from '@/lib/product-items-instances-service';
import type { ProductCollection, ProductItem } from '@/lib/types';
import { ImportFromTemplateDialog } from './import-from-template-dialog';

interface EditProposalCollectionClientProps {
	organisationId: string;
	proposalId: string;
	collectionId: string;
}

export function EditProposalCollectionClient({
	organisationId,
	proposalId,
	collectionId,
}: EditProposalCollectionClientProps) {
	const tProducts = useTranslations('products');
	const tProposals = useTranslations('proposals');
	const router = useRouter();
	const [collection, setCollection] = useState<ProductCollection | null>(null);
	const [items, setItems] = useState<ProductItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ProductItem | null>(null);

	// Import-from-template dialog
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const [c, its] = await Promise.all([
					productCollectionsInstancesService.getCollection(collectionId),
					productItemsInstancesService.getItemsByCollection(collectionId),
				]);
				if (!c) {
					toast.error(tProposals('collectionNotFound'), {
						style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
					});
					return;
				}
				setCollection(c);
				setItems(its);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : tProposals('collectionLoadFailed'), {
					style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
				});
			} finally {
				setIsLoading(false);
			}
		})();

		const colSub = productCollectionsInstancesService.subscribeToCollection(
			collectionId,
			(payload) => {
				if (payload.eventType === 'UPDATE') setCollection(payload.new as ProductCollection);
			}
		);
		const itemsSub = productItemsInstancesService.subscribeToItemsByCollection(
			collectionId,
			(payload) => {
				if (payload.eventType === 'INSERT') setItems((prev) => [payload.new as ProductItem, ...prev]);
				else if (payload.eventType === 'UPDATE')
					setItems((prev) =>
						prev.map((i) => (i.id === payload.new.id ? (payload.new as ProductItem) : i))
					);
				else if (payload.eventType === 'DELETE')
					setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
			}
		);
		return () => {
			colSub.unsubscribe();
			itemsSub.unsubscribe();
		};
	}, [collectionId]);

	const handleImportSuccess = (created: ProductItem[]) => {
		setItems((prev) => [...prev, ...created].sort((a, b) => a.position - b.position));
	};

	const handleSubmit = async (data: Partial<ProductCollection>) => {
		setIsSaving(true);
		try {
			await productCollectionsInstancesService.updateCollection(collectionId, {
				name: data.name || '',
				description: data.description || '',
				discount: data.discount || null,
				discount_type: data.discount_type || null,
				show_prices: data.show_prices !== false,
			});
			toast.success(tProposals('collectionUpdatedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProposals('collectionUpdateFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await productCollectionsInstancesService.deleteCollection(collectionId);
			toast.success(tProposals('collectionDeletedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
			router.push(`/dashboard/proposals/${proposalId}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProposals('collectionDeleteFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
			setIsDeleting(false);
		}
	};

	const handleAddItem = () => {
		setEditingItem(null);
		setIsModalOpen(true);
	};

	const handleEditItem = (item: ProductItem) => {
		setEditingItem(item);
		setIsModalOpen(true);
	};

	const handleModalSuccess = (item: ProductItem) => {
		if (editingItem) {
			// Update existing item
			setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
		} else {
			// Add new item
			setItems((prev) => [item, ...prev]);
		}
	};

	const handleCreateItem = async (data: Partial<ProductItem>) => {
		return await productItemsInstancesService.createItem({
			product_collection_id: collectionId,
			name: data.name || '',
			description: data.description || null,
			unit_price: Number(data.unit_price) || 0,
			unit_type: data.unit_type || '',
			unit_amount: Number(data.unit_amount) || 1,
			organisation_id: organisationId,
		} as any);
	};

	const handleUpdateItem = async (data: Partial<ProductItem>) => {
		if (!editingItem) throw new Error('No item to update');
		return await productItemsInstancesService.updateItem(editingItem.id, {
			name: data.name || '',
			description: data.description || null,
			unit_price: Number(data.unit_price) || 0,
			unit_type: data.unit_type || '',
			unit_amount: Number(data.unit_amount) || 1,
		});
	};

	const handleDeleteItem = async (item: ProductItem) => {
		// Optimistic update: Remove item from state immediately
		setItems((prev) => prev.filter((i) => i.id !== item.id));

		try {
			await productItemsInstancesService.deleteItem(item.id);
			toast.success(tProposals('itemDeletedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			// Rollback on error: Re-add the item if deletion failed
			setItems((prev) => [...prev, item].sort((a, b) => a.position - b.position));
			toast.error(err instanceof Error ? err.message : tProposals('itemDeleteFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		}
	};

	const handleReorderItems = async (reorderedItems: ProductItem[]) => {
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
				updates.map((update) =>
					productItemsInstancesService.updateItemPosition(update.id, update.position)
				)
			);

			// Update local state
			setItems(
				reorderedItems.map((item, index) => ({
					...item,
					position: updates[index].position,
				}))
			);

			toast.success(tProposals('itemsReorderedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProposals('itemsReorderFailed'), {
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
			getValue: (data) => (data as ProductCollection).show_prices !== false,
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
			name: 'description',
			label: tProducts('description'),
			type: 'textarea',
			required: false,
			placeholder: tProducts('itemDescriptionPlaceholder'),
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
		{
			name: 'unit_amount',
			label: tProducts('unitAmount'),
			type: 'number',
			required: true,
			placeholder: 'e.g. 1',
		},
	];

	const renderItem = (item: ProductItem) => ({
		id: item.id,
		title: item.name,
		subtitle: `${item.unit_amount} ${item.unit_type} • €${item.unit_price}`,
		description: item.description ?? undefined,
		highlightedMetadata: {
			Total: `€${(item.unit_amount * item.unit_price).toFixed(2)}`,
		},
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
					<Button onClick={() => router.push(`/dashboard/proposals/${proposalId}`)} className="mt-4">
						Back
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
					backHref={`/dashboard/proposals/${proposalId}`}
					entityType="product-collection"
					entityId={collectionId}
				/>
			</div>
			<div className="container mx-auto p-6">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>{tProducts('items')}</CardTitle>
								<CardDescription>{tProducts('manageItemsFor', { name: collection.name })}</CardDescription>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" onClick={() => setIsImportDialogOpen(true)} size="sm">
									<FileDown className="w-4 h-4 mr-2" />
									{tProducts('importFromTemplate')}
								</Button>
								<Button onClick={handleAddItem} size="sm">
									<Plus className="w-4 h-4 mr-2" />
									{tProducts('addItem')}
								</Button>
							</div>
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

			<ImportFromTemplateDialog
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
				organisationId={organisationId}
				collectionId={collectionId}
				onImportSuccess={handleImportSuccess}
			/>

			{/* Item Modal */}
			<CrudModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				mode={editingItem ? 'edit' : 'create'}
				title={editingItem ? tProducts('editItem') : tProducts('createItem')}
				description={editingItem ? tProducts('editItem') : tProducts('createNewItem')}
				fields={itemFields}
				initialData={editingItem || { unit_amount: 1, unit_price: 0 }}
				onSubmit={editingItem ? handleUpdateItem : handleCreateItem}
				onSuccess={handleModalSuccess}
				entityType="product-item"
				entityId={editingItem?.id}
				organisationId={organisationId}
			/>
		</div>
	);
}
