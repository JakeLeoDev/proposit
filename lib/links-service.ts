import { createClient } from '@/lib/supabase/client';
import type { Link } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class LinksService {
	private supabase = createClient();

	async getLinkByProposal(proposalId: string): Promise<Link | null> {
		const { data, error } = await this.supabase
			.from('links')
			.select('*')
			.eq('proposal_id', proposalId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (error) {
			throw mapServiceError(error, 'fetch');
		}
		if (!data) return null;
		if (new Date(data.exp_date) < new Date()) return null;
		return data as Link;
	}

	async createLink(proposalId: string, organisationId: string): Promise<Link> {
		const token = crypto.randomUUID().replace(/-/g, '');
		const exp_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const { data, error } = await this.supabase
			.from('links')
			.insert({ proposal_id: proposalId, organisation_id: organisationId, token, exp_date })
			.select()
			.single();
		if (error) {
			throw mapServiceError(error, 'create');
		}
		return data as Link;
	}

	async deleteLink(linkId: string): Promise<void> {
		const { error } = await this.supabase.from('links').delete().eq('id', linkId);
		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}
}

export const linksService = new LinksService();
