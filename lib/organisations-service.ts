import { createClient } from '@/lib/supabase/client';
import type { Organisation } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class OrganisationsService {
	private supabase = createClient();

	async getOrganisation(id: string): Promise<Organisation | null> {
		const { data, error } = await this.supabase
			.from('organisations')
			.select('*')
			.eq('id', id)
			.single();
		if (error) {
			if ((error as any).code === 'PGRST116') return null;
			throw mapServiceError(error, 'fetch');
		}
		return data as Organisation;
	}

	async updateOrganisation(
		id: string,
		updates: Partial<Omit<Organisation, 'id' | 'created_at'>>
	): Promise<Organisation> {
		// Strip ai_api_key — it must only be written via the server API route
		const { ai_api_key: _stripped, ...safeUpdates } = updates as any;
		const { data, error } = await this.supabase
			.from('organisations')
			.update(safeUpdates)
			.eq('id', id)
			.select('*')
			.single();
		if (error) {
			throw mapServiceError(error, 'update');
		}
		return data as Organisation;
	}

	subscribeToOrganisation(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`organisation-${id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'organisations', filter: `id=eq.${id}` },
				callback
			)
			.subscribe();
	}
}

export const organisationsService = new OrganisationsService();
