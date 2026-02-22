import { createClient } from '@/lib/supabase/client';
import type { OrganisationInvitation } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class InvitationsService {
	private supabase = createClient();

	/**
	 * Get all invitations for an organisation
	 */
	async getInvitations(organisationId: string): Promise<OrganisationInvitation[]> {
		const { data, error } = await this.supabase
			.from('organisation_invitations')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}
		return data || [];
	}

	/**
	 * Get a single invitation by ID
	 */
	async getInvitation(id: string): Promise<OrganisationInvitation | null> {
		const { data, error } = await this.supabase
			.from('organisation_invitations')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') return null;
			throw mapServiceError(error, 'fetch');
		}
		return data as OrganisationInvitation;
	}

	/**
	 * Get an invitation by token
	 */
	async getInvitationByToken(token: string): Promise<OrganisationInvitation | null> {
		const { data, error } = await this.supabase
			.from('organisation_invitations')
			.select('*')
			.eq('token', token)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') return null;
			throw mapServiceError(error, 'fetch');
		}
		return data as OrganisationInvitation;
	}

	/**
	 * Create a new invitation
	 */
	async createInvitation(
		organisationId: string,
		email: string,
		invitedBy: string
	): Promise<OrganisationInvitation> {
		// Generate a random token
		const token = crypto.randomUUID();

		// Set expiration to 7 days from now
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		const { data, error } = await this.supabase
			.from('organisation_invitations')
			.insert({
				organisation_id: organisationId,
				email: email.toLowerCase().trim(),
				invited_by: invitedBy,
				token,
				expires_at: expiresAt.toISOString(),
			})
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data as OrganisationInvitation;
	}

	/**
	 * Generate invitation URL for sharing
	 */
	generateInvitationUrl(token: string): string {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (!baseUrl) {
			throw new Error('NEXT_PUBLIC_APP_URL is not configured');
		}
		return `${baseUrl}/auth/accept-invitation?token=${token}`;
	}

	/**
	 * Accept an invitation and add user to organisation
	 */
	async acceptInvitation(token: string, userId: string): Promise<void> {
		const invitation = await this.getInvitationByToken(token);

		if (!invitation) {
			throw new Error('Invitation not found');
		}

		if (invitation.accepted_at) {
			throw new Error('Invitation has already been accepted');
		}

		const expiresAt = new Date(invitation.expires_at);
		if (expiresAt < new Date()) {
			throw new Error('Invitation has expired');
		}

		// Add user to organisation
		const { error: memberError } = await this.supabase.from('organisation_users').insert({
			organisation_id: invitation.organisation_id,
			user_id: userId,
			role: 'member',
		});

		if (memberError) {
			throw mapServiceError(memberError, 'create');
		}

		// Mark invitation as accepted
		const { error: updateError } = await this.supabase
			.from('organisation_invitations')
			.update({ accepted_at: new Date().toISOString() })
			.eq('id', invitation.id);

		if (updateError) {
			console.error('Failed to mark invitation as accepted:', updateError);
		}
	}

	/**
	 * Delete an invitation
	 */
	async deleteInvitation(id: string): Promise<void> {
		const { error } = await this.supabase.from('organisation_invitations').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	/**
	 * Subscribe to invitations changes for an organisation
	 */
	subscribeToInvitations(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`invitations-${organisationId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'organisation_invitations',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}
}

export const invitationsService = new InvitationsService();
