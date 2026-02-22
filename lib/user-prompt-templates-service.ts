import { createClient } from '@/lib/supabase/client';
import type { UserPromptTemplate } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class UserPromptTemplatesService {
	private supabase = createClient();

	// Get all prompt templates for a user
	async getPromptTemplates(userId: string): Promise<UserPromptTemplate[]> {
		const { data, error } = await this.supabase
			.from('user_prompt_templates')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single prompt template by ID
	async getPromptTemplate(id: string): Promise<UserPromptTemplate | null> {
		const { data, error } = await this.supabase
			.from('user_prompt_templates')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new prompt template
	async createPromptTemplate(
		template: Omit<UserPromptTemplate, 'id' | 'created_at'>
	): Promise<UserPromptTemplate> {
		const { data, error } = await this.supabase
			.from('user_prompt_templates')
			.insert(template)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Update an existing prompt template
	async updatePromptTemplate(
		id: string,
		updates: Partial<Omit<UserPromptTemplate, 'id' | 'created_at' | 'user_id'>>
	): Promise<UserPromptTemplate> {
		const { data, error } = await this.supabase
			.from('user_prompt_templates')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete a prompt template
	async deletePromptTemplate(id: string): Promise<void> {
		const { error } = await this.supabase.from('user_prompt_templates').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for prompt templates
	subscribeToPromptTemplates(userId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('prompt-templates-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_prompt_templates',
					filter: `user_id=eq.${userId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific prompt template
	subscribeToPromptTemplate(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`prompt-template-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'user_prompt_templates',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const userPromptTemplatesService = new UserPromptTemplatesService();
