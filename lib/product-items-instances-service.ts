import { createClient } from '@/lib/supabase/client';
import type { ProductItem } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class ProductItemsInstancesService {
	private supabase = createClient();

	async getItemsByCollection(collectionId: string): Promise<ProductItem[]> {
		const { data, error } = await this.supabase
			.from('product_items')
			.select('*')
			.eq('product_collection_id', collectionId)
			.order('position', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return (data as ProductItem[]) || [];
	}

	async getItem(id: string): Promise<ProductItem | null> {
		const { data, error } = await this.supabase
			.from('product_items')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') return null;
			throw mapServiceError(error, 'fetch');
		}

		return data as ProductItem;
	}

	async createItem(item: Omit<ProductItem, 'id' | 'created_at' | 'position'>): Promise<ProductItem> {
		// Calculate next position
		const { data: existingItems, error: fetchError } = await this.supabase
			.from('product_items')
			.select('position')
			.eq('product_collection_id', item.product_collection_id)
			.order('position', { ascending: false })
			.limit(1);

		if (fetchError) {
			throw mapServiceError(fetchError, 'fetch');
		}

		const nextPosition =
			existingItems && existingItems.length > 0 ? existingItems[0].position + 1000 : 1000;

		const { data, error } = await this.supabase
			.from('product_items')
			.insert({ ...item, position: nextPosition } as any)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data as ProductItem;
	}

	async updateItem(
		id: string,
		updates: Partial<
			Omit<ProductItem, 'id' | 'created_at' | 'organisation_id' | 'product_collection_id'>
		>
	): Promise<ProductItem> {
		const { data, error } = await this.supabase
			.from('product_items')
			.update(updates as any)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data as ProductItem;
	}

	async updateItemPosition(itemId: string, newPosition: number): Promise<void> {
		const { error } = await this.supabase
			.from('product_items')
			.update({ position: newPosition })
			.eq('id', itemId);

		if (error) {
			throw mapServiceError(error, 'update');
		}
	}

	async deleteItem(id: string): Promise<void> {
		const { error } = await this.supabase.from('product_items').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	subscribeToItemsByCollection(collectionId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`productitems-collection-${collectionId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'productitems',
					filter: `product_collection_id=eq.${collectionId}`,
				},
				callback
			)
			.subscribe();
	}

	subscribeToItem(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`productitem-${id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'productitems', filter: `id=eq.${id}` },
				callback
			)
			.subscribe();
	}
}

export const productItemsInstancesService = new ProductItemsInstancesService();
