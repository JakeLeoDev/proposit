import { createClient } from '@/lib/supabase/client';
import type { Person } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class PersonsService {
	private supabase = createClient();

	// Get all persons for an organization
	async getPersons(organisationId: string): Promise<Person[]> {
		const { data, error } = await this.supabase
			.from('persons')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get all persons for a specific company
	async getPersonsByCompany(companyId: string): Promise<Person[]> {
		const { data, error } = await this.supabase
			.from('persons')
			.select('*')
			.eq('company_id', companyId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single person by ID
	async getPerson(id: string): Promise<Person | null> {
		const { data, error } = await this.supabase.from('persons').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new person
	async createPerson(person: Omit<Person, 'id' | 'created_at'>): Promise<Person> {
		const { data, error } = await this.supabase.from('persons').insert(person).select().single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Create a person with minimal info
	async createPersonWithCompany(
		firstName: string,
		lastName: string,
		companyId: string,
		organisationId: string
	): Promise<Person> {
		const { data, error } = await this.supabase
			.from('persons')
			.insert({
				first_name: firstName,
				last_name: lastName,
				company_id: companyId,
				organisation_id: organisationId,
			})
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Create minimal person for autocomplete (with dependency support)
	async createMinimalPerson(
		firstName: string,
		lastName: string,
		organisationId: string,
		dependencies?: Record<string, string>
	): Promise<Person> {
		const companyId = dependencies?.company || dependencies?.company_id;
		if (!companyId) {
			throw new Error('Person requires company_id in dependencies');
		}

		return this.createPersonWithCompany(firstName, lastName, companyId, organisationId);
	}

	// Update an existing person
	async updatePerson(
		id: string,
		updates: Partial<Omit<Person, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Person> {
		const { data, error } = await this.supabase
			.from('persons')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete a person
	async deletePerson(id: string): Promise<void> {
		const { error } = await this.supabase.from('persons').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for persons
	subscribeToPersons(organisationId: string, callback: (payload: Record<string, unknown>) => void) {
		return this.supabase
			.channel('persons-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'persons',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for persons in a specific company
	subscribeToPersonsByCompany(
		companyId: string,
		callback: (payload: Record<string, unknown>) => void
	) {
		return this.supabase
			.channel(`persons-company-${companyId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'persons',
					filter: `company_id=eq.${companyId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific person
	subscribeToPerson(id: string, callback: (payload: Record<string, unknown>) => void) {
		return this.supabase
			.channel(`person-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'persons',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const personsService = new PersonsService();
