import { createClient } from '@/lib/supabase/client';
import type { Company } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class CompaniesService {
	private supabase = createClient();

	// Get all companies for an organization
	async getCompanies(organisationId: string): Promise<Company[]> {
		const { data, error } = await this.supabase
			.from('companies')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single company by ID
	async getCompany(id: string): Promise<Company | null> {
		const { data, error } = await this.supabase.from('companies').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new company
	async createCompany(company: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
		const { data, error } = await this.supabase.from('companies').insert(company).select().single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Create a minimal company with just name and organisation_id
	async createMinimalCompany(name: string, organisationId: string): Promise<Company> {
		const { data, error } = await this.supabase
			.from('companies')
			.insert({
				name,
				legal_name: name,
				organisation_id: organisationId,
			})
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Update an existing company
	async updateCompany(
		id: string,
		updates: Partial<Omit<Company, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Company> {
		const { data, error } = await this.supabase
			.from('companies')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete a company
	async deleteCompany(id: string): Promise<void> {
		const { error } = await this.supabase.from('companies').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for companies
	subscribeToCompanies(
		organisationId: string,
		callback: (payload: Record<string, unknown>) => void
	) {
		return this.supabase
			.channel('companies-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'companies',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific company
	subscribeToCompany(id: string, callback: (payload: Record<string, unknown>) => void) {
		return this.supabase
			.channel(`company-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'companies',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const companiesService = new CompaniesService();
