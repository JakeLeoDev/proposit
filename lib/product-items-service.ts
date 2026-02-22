import { createClient } from '@/lib/supabase/client';
import type { ProductItemTemplate } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class ProductItemsService {
	private supabase = createClient();

	async getItems(organisationId: string): Promise<ProductItemTemplate[]> {
		const { data, error } = await this.supabase
			.from('product_items_templates')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	async getItemsByCollection(collectionId: string): Promise<ProductItemTemplate[]> {
		const { data, error } = await this.supabase
			.from('product_items_templates')
			.select('*')
			.eq('collection_id', collectionId)
			.order('position', { ascending: true })
			.order('created_at', { ascending: true });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	async getItem(id: string): Promise<ProductItemTemplate | null> {
		const { data, error } = await this.supabase
			.from('product_items_templates')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') {
				return null;
			}
			throw mapServiceError(error, 'fetch');
		}

		return data as ProductItemTemplate;
	}

	async createItem(
		item: Omit<ProductItemTemplate, 'id' | 'created_at' | 'position'>
	): Promise<ProductItemTemplate> {
		// Calculate next position
		const { data: existingItems, error: fetchError } = await this.supabase
			.from('product_items_templates')
			.select('position')
			.eq('collection_id', item.collection_id)
			.order('position', { ascending: false })
			.limit(1);

		if (fetchError) {
			throw mapServiceError(fetchError, 'fetch');
		}

		const nextPosition =
			existingItems && existingItems.length > 0 ? existingItems[0].position + 1000 : 1000;

		const { data, error } = await this.supabase
			.from('product_items_templates')
			.insert({ ...item, position: nextPosition })
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data as ProductItemTemplate;
	}

	async updateItem(
		id: string,
		updates: Partial<
			Omit<ProductItemTemplate, 'id' | 'created_at' | 'organisation_id' | 'collection_id'>
		>
	): Promise<ProductItemTemplate> {
		const { data, error } = await this.supabase
			.from('product_items_templates')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data as ProductItemTemplate;
	}

	async updateItemPosition(itemId: string, newPosition: number): Promise<void> {
		const { error } = await this.supabase
			.from('product_items_templates')
			.update({ position: newPosition })
			.eq('id', itemId);

		if (error) {
			throw mapServiceError(error, 'update');
		}
	}

	async deleteItem(id: string): Promise<void> {
		const { error } = await this.supabase.from('product_items_templates').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	subscribeToItems(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('productitems_templates-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'productitems_templates',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	subscribeToItemsByCollection(collectionId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`productitems_templates-collection-${collectionId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'productitems_templates',
					filter: `collection_id=eq.${collectionId}`,
				},
				callback
			)
			.subscribe();
	}

	subscribeToItem(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`productitem_template-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'productitems_templates',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

export const productItemsService = new ProductItemsService();
