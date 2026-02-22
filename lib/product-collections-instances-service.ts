import { createClient } from '@/lib/supabase/client';
import type { ProductCollection, ProductItem } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class ProductCollectionsInstancesService {
	private supabase = createClient();

	async getCollectionsByProposal(proposalId: string): Promise<ProductCollection[]> {
		const { data, error } = await this.supabase
			.from('product_collections')
			.select('*')
			.eq('proposal_id', proposalId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return (data as ProductCollection[]) || [];
	}

	async getCollection(id: string): Promise<ProductCollection | null> {
		const { data, error } = await this.supabase
			.from('product_collections')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') return null;
			throw mapServiceError(error, 'fetch');
		}

		return data as ProductCollection;
	}

	async createCollection(
		collection: Omit<ProductCollection, 'id' | 'created_at'>
	): Promise<ProductCollection> {
		const { data, error } = await this.supabase
			.from('product_collections')
			.insert(collection as any)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data as ProductCollection;
	}

	async updateCollection(
		id: string,
		updates: Partial<Omit<ProductCollection, 'id' | 'created_at' | 'organisation_id' | 'proposal_id'>>
	): Promise<ProductCollection> {
		const { data, error } = await this.supabase
			.from('product_collections')
			.update(updates as any)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data as ProductCollection;
	}

	async deleteCollection(id: string): Promise<void> {
		const { error } = await this.supabase.from('product_collections').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	subscribeToCollectionsByProposal(proposalId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`product_collections-proposal-${proposalId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'product_collections',
					filter: `proposal_id=eq.${proposalId}`,
				},
				callback
			)
			.subscribe();
	}

	subscribeToCollection(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`product_collection-${id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'product_collections', filter: `id=eq.${id}` },
				callback
			)
			.subscribe();
	}

	// Copy items from a productitems_templates collection into productitems (instance)
	async copyItemsFromTemplate(
		instanceCollectionId: string,
		templateCollectionId: string,
		organisationId: string
	): Promise<ProductItem[]> {
		// Load template items
		const { data: templateItems, error: loadErr } = await this.supabase
			.from('product_items_templates')
			.select('*')
			.eq('collection_id', templateCollectionId);

		if (loadErr) {
			throw mapServiceError(loadErr, 'fetch');
		}

		const itemsToInsert = (templateItems || []).map((ti: any, index: number) => ({
			product_collection_id: instanceCollectionId,
			name: ti.name,
			description: ti.description ?? null,
			unit_price: ti.unit_price,
			unit_type: ti.unit_type, // DB is text
			unit_amount: 1,
			organisation_id: organisationId,
			position: ti.position || (index + 1) * 1000, // Use template position or calculate new one
		}));

		if (itemsToInsert.length === 0) return [];

		const { data, error } = await this.supabase
			.from('product_items')
			.insert(itemsToInsert)
			.select('*');

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return (data as ProductItem[]) || [];
	}

	/** Copy selected template items by ID into an instance collection. Returns the newly created ProductItem[]. */
	async copySelectedItemsFromTemplate(
		instanceCollectionId: string,
		templateItemIds: string[],
		organisationId: string
	): Promise<ProductItem[]> {
		if (templateItemIds.length === 0) return [];

		const { data: templateItems, error: loadErr } = await this.supabase
			.from('product_items_templates')
			.select('*')
			.in('id', templateItemIds)
			.order('position', { ascending: true });

		if (loadErr) {
			throw mapServiceError(loadErr, 'fetch');
		}

		const items = (templateItems || []) as Array<{
			id: string;
			name: string;
			description: string | null;
			unit_price: number;
			unit_type: string;
			position: number;
		}>;
		if (items.length === 0) return [];

		const { data: existingItems, error: fetchError } = await this.supabase
			.from('product_items')
			.select('position')
			.eq('product_collection_id', instanceCollectionId)
			.order('position', { ascending: false })
			.limit(1);

		if (fetchError) {
			throw mapServiceError(fetchError, 'fetch');
		}

		const basePosition =
			existingItems && existingItems.length > 0 ? existingItems[0].position + 1000 : 1000;

		const itemsToInsert = items.map((ti, index) => ({
			product_collection_id: instanceCollectionId,
			name: ti.name,
			description: ti.description ?? null,
			unit_price: ti.unit_price,
			unit_type: ti.unit_type,
			unit_amount: 1,
			organisation_id: organisationId,
			position: basePosition + index * 1000,
		}));

		const { data, error } = await this.supabase
			.from('product_items')
			.insert(itemsToInsert)
			.select('*');

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return (data as ProductItem[]) || [];
	}
}

export const productCollectionsInstancesService = new ProductCollectionsInstancesService();
