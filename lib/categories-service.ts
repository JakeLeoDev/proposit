import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class CategoriesService {
	private supabase = createClient();

	// Get all categories for an organization
	async getCategories(organisationId: string): Promise<Category[]> {
		const { data, error } = await this.supabase
			.from('categories')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single category by ID
	async getCategory(id: string): Promise<Category | null> {
		const { data, error } = await this.supabase.from('categories').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new category
	async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
		const { data, error } = await this.supabase.from('categories').insert(category).select().single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Create a minimal category with just name and organisation_id
	async createMinimalCategory(name: string, organisationId: string): Promise<Category> {
		const { data, error } = await this.supabase
			.from('categories')
			.insert({
				name,
				description: '',
				organisation_id: organisationId,
			})
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Update an existing category
	async updateCategory(
		id: string,
		updates: Partial<Omit<Category, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Category> {
		const { data, error } = await this.supabase
			.from('categories')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete a category
	async deleteCategory(id: string): Promise<void> {
		const { error } = await this.supabase.from('categories').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for categories
	subscribeToCategories(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('categories-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'categories',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific category
	subscribeToCategory(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`category-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'categories',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const categoriesService = new CategoriesService();
