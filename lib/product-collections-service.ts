import { createClient } from '@/lib/supabase/client';
import type { ProductCollectionTemplate } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class ProductCollectionsService {
	private supabase = createClient();

	async getCollections(organisationId: string): Promise<ProductCollectionTemplate[]> {
		const { data, error } = await this.supabase
			.from('product_collections_templates')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	async getCollection(id: string): Promise<ProductCollectionTemplate | null> {
		const { data, error } = await this.supabase
			.from('product_collections_templates')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') {
				return null;
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	async createCollection(
		collection: Omit<ProductCollectionTemplate, 'id' | 'created_at'>
	): Promise<ProductCollectionTemplate> {
		const { data, error } = await this.supabase
			.from('product_collections_templates')
			.insert(collection)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data as ProductCollectionTemplate;
	}

	async updateCollection(
		id: string,
		updates: Partial<Omit<ProductCollectionTemplate, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<ProductCollectionTemplate> {
		const { data, error } = await this.supabase
			.from('product_collections_templates')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data as ProductCollectionTemplate;
	}

	async deleteCollection(id: string): Promise<void> {
		const { error } = await this.supabase.from('product_collections_templates').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	subscribeToCollections(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('product_collections_templates-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'product_collections_templates',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	subscribeToCollection(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`product_collections_templates-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'product_collections_templates',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

export const productCollectionsService = new ProductCollectionsService();
