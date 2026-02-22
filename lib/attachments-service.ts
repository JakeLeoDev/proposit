import { createClient } from '@/lib/supabase/client';
import type { Attachment } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class AttachmentsService {
	private supabase = createClient();

	// Get all attachments for an organization
	async getAttachments(organisationId: string): Promise<Attachment[]> {
		const { data, error } = await this.supabase
			.from('attachments')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single attachment by ID
	async getAttachment(id: string): Promise<Attachment | null> {
		const { data, error } = await this.supabase.from('attachments').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new attachment
	async createAttachment(attachment: Omit<Attachment, 'id' | 'created_at'>): Promise<Attachment> {
		const { data, error } = await this.supabase
			.from('attachments')
			.insert(attachment)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Update an existing attachment
	async updateAttachment(
		id: string,
		updates: Partial<Omit<Attachment, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Attachment> {
		const { data, error } = await this.supabase
			.from('attachments')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete an attachment
	async deleteAttachment(id: string): Promise<void> {
		const { error } = await this.supabase.from('attachments').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for attachments
	subscribeToAttachments(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('attachments-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'attachments',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific attachment
	subscribeToAttachment(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`attachment-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'attachments',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const attachmentsService = new AttachmentsService();
