import { createClient } from '@/lib/supabase/server';
import { decryptFields } from '@/lib/encrypted-fields';
import type { User, OrganisationUserWithOrganisation, Organisation } from '@/lib/types';

export async function getUser() {
	// Check if environment variables are set
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
		console.error('Missing Supabase environment variables. Please check your .env.local file.');
		return null;
	}

	try {
		const supabase = await createClient();
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error) {
			// Don't log error for missing sessions - this is normal for unauthenticated users
			if (error.message !== 'Auth session missing!') {
				console.error('Error getting user:', error.message);
			}
			return null;
		}

		return user;
	} catch (error) {
		console.error('Failed to create Supabase client:', error);
		return null;
	}
}

/**
 * Gets the current user without logging errors for missing sessions
 * Use this in auth pages where missing sessions are expected
 */
export async function getUserSilently() {
	// Check if environment variables are set
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
		return null;
	}

	try {
		const supabase = await createClient();
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error) {
			// Silently return null for any auth errors
			return null;
		}

		return user;
	} catch {
		// Silently return null for any errors
		return null;
	}
}

export async function getUserProfile() {
	const user = await getUser();
	if (!user) return null;

	try {
		const supabase = await createClient();
		const { data: profile, error } = await supabase
			.from('users')
			.select('*')
			.eq('id', user.id)
			.single();

		if (error) {
			console.error('Error getting user profile:', error.message);
			return null;
		}

		return profile as User;
	} catch (error) {
		console.error('Failed to get user profile:', error);
		return null;
	}
}

export async function getUserOrganisation() {
	const user = await getUser();
	if (!user) return null;

	try {
		const supabase = await createClient();
		const { data: membership, error } = await supabase
			.from('organisation_users')
			.select(
				`
                organisation_id,
                user_id,
                role,
                joined_at,
                organisations (
                    id,
                    name,
                    created_at,
                    ai_feature,
                    ai_api_key,
                    ai_system_prompt,
                    smtp_enabled,
                    smtp_host,
                    smtp_port,
                    smtp_user,
                    smtp_pass,
                    smtp_pass_hint,
                    smtp_from,
                    smtp_secure
                )
            `
			)
			.eq('user_id', user.id)
			.maybeSingle();

		if (error) {
			console.error('Error getting user organisation:', error.message);
			return null;
		}

		// If no membership found, return null
		if (!membership) {
			return null;
		}

		const org = (
			Array.isArray(membership.organisations) ? membership.organisations[0] : membership.organisations
		) as Organisation;

		// Decrypt sensitive fields server-side
		const decryptedOrg = decryptFields(org, ['ai_api_key', 'smtp_pass']);

		return {
			...membership,
			organisations: decryptedOrg,
		} as OrganisationUserWithOrganisation;
	} catch (error) {
		console.error('Failed to get user organisation:', error);
		return null;
	}
}

// Legacy function name for backward compatibility
export async function getUserOrganization() {
	return getUserOrganisation();
}

export async function createUserProfile(userId: string, displayName?: string) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from('users')
			.insert({
				id: userId,
				display_name: displayName || null,
				avatar_url: null,
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating user profile:', error.message);
			return null;
		}

		return data as User;
	} catch (error) {
		console.error('Failed to create user profile:', error);
		return null;
	}
}

export async function createOrganisationMembership(
	userId: string,
	organisationId: string,
	role: string = 'member'
) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from('organisation_users')
			.insert({
				user_id: userId,
				organisation_id: organisationId,
				role: role,
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating organisation membership:', error.message);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to create organisation membership:', error);
		return null;
	}
}
