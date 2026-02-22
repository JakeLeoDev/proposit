'use server';

import { createServiceClient } from '@/lib/supabase/server';

/**
 * Checks whether an email address is on the allowed_registrations allowlist.
 * Used in multi-invite tenant mode to gate self-registration.
 * Uses the service role client so it bypasses RLS.
 */
export async function checkEmailAllowedAction(
	email: string
): Promise<{ allowed: boolean }> {
	try {
		const supabase = createServiceClient();
		const { data, error } = await supabase
			.from('allowed_registrations')
			.select('id')
			.ilike('email', email.trim())
			.maybeSingle();

		if (error) {
			console.error('Failed to check allowed_registrations:', error);
			return { allowed: false };
		}

		return { allowed: data !== null };
	} catch {
		return { allowed: false };
	}
}
