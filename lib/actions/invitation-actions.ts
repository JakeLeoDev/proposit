'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email-service';
import { buildInvitationEmail } from '@/lib/email-templates/invitation';

/**
 * Accept an invitation and add user to organisation
 * Uses service role client to bypass RLS policies
 */
export async function acceptInvitationAction(
	token: string,
	userId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabaseService = createServiceClient();

		// Get the invitation by token
		const { data: invitation, error: invitationError } = await supabaseService
			.from('organisation_invitations')
			.select('*')
			.eq('token', token)
			.single();

		if (invitationError || !invitation) {
			return { success: false, error: 'Invitation not found' };
		}

		// Validate invitation
		if (invitation.accepted_at) {
			return { success: false, error: 'Invitation has already been accepted' };
		}

		const expiresAt = new Date(invitation.expires_at);
		if (expiresAt < new Date()) {
			return { success: false, error: 'Invitation has expired' };
		}

		// Add user to organisation using service role (bypasses RLS)
		const { error: memberError } = await supabaseService.from('organisation_users').insert({
			organisation_id: invitation.organisation_id,
			user_id: userId,
			role: 'member',
		});

		if (memberError) {
			console.error('Error adding user to organisation:', memberError.message);
			return { success: false, error: `Failed to add user to organisation: ${memberError.message}` };
		}

		// Mark invitation as accepted
		const { error: updateError } = await supabaseService
			.from('organisation_invitations')
			.update({ accepted_at: new Date().toISOString() })
			.eq('id', invitation.id);

		if (updateError) {
			console.error('Failed to mark invitation as accepted:', updateError);
			// Don't fail the whole operation if this update fails - user is already added
		}

		return { success: true };
	} catch (error) {
		console.error('Failed to accept invitation:', error);
		return { success: false, error: 'An unexpected error occurred' };
	}
}

/**
 * Send an invitation email to the invitee
 * Uses service role client to fetch invitation + organisation + inviter details
 */
export async function sendInvitationEmailAction(
	invitationId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabaseService = createServiceClient();

		const { data: invitation, error: invErr } = await supabaseService
			.from('organisation_invitations')
			.select('*')
			.eq('id', invitationId)
			.single();

		if (invErr || !invitation) {
			return { success: false, error: 'Invitation not found' };
		}

		const { data: organisation, error: orgErr } = await supabaseService
			.from('organisations')
			.select('name')
			.eq('id', invitation.organisation_id)
			.single();

		if (orgErr || !organisation) {
			return { success: false, error: 'Organisation not found' };
		}

		const { data: inviter, error: userErr } = await supabaseService
			.from('users')
			.select('first_name, last_name, display_name')
			.eq('id', invitation.invited_by)
			.single();

		const invitedByName =
			inviter && !userErr
				? inviter.first_name && inviter.last_name
					? `${inviter.first_name} ${inviter.last_name}`
					: (inviter.display_name ?? 'Someone')
				: 'Someone';

		const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (!baseUrl) {
			return { success: false, error: 'APP_URL not configured' };
		}
		const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${invitation.token}`;

		const { subject, html, text } = buildInvitationEmail({
			organisationName: organisation.name,
			invitedByName,
			invitationUrl,
		});

		await sendEmail({ to: invitation.email, subject, html, text });

		return { success: true };
	} catch (error) {
		console.error('Failed to send invitation email:', error);
		return { success: false, error: 'Failed to send email' };
	}
}
