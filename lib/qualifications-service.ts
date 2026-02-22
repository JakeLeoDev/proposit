import { createClient } from '@/lib/supabase/client';
import type { Qualification } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class QualificationsService {
	private supabase = createClient();

	// Get all qualifications for an organization
	async getQualifications(organisationId: string): Promise<Qualification[]> {
		const { data, error } = await this.supabase
			.from('qualifications')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single qualification by ID
	async getQualification(id: string): Promise<Qualification | null> {
		const { data, error } = await this.supabase
			.from('qualifications')
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

	// Create a new qualification
	async createQualification(
		qualification: Omit<Qualification, 'id' | 'created_at'>
	): Promise<Qualification> {
		const { data, error } = await this.supabase
			.from('qualifications')
			.insert(qualification)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Update an existing qualification
	async updateQualification(
		id: string,
		updates: Partial<Omit<Qualification, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Qualification> {
		const { data, error } = await this.supabase
			.from('qualifications')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete a qualification
	async deleteQualification(id: string): Promise<void> {
		const { error } = await this.supabase.from('qualifications').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for qualifications
	subscribeToQualifications(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('qualifications-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'qualifications',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific qualification
	subscribeToQualification(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`qualification-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'qualifications',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const qualificationsService = new QualificationsService();
