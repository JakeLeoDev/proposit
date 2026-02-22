'use server';

import { createServiceClient } from '@/lib/supabase/server';
import type { User } from '@/lib/types';

interface UserProfileData {
	display_name?: string;
	first_name?: string;
	last_name?: string;
	avatar_url?: string;
}

export async function updateUserProfileAction(
	userId: string,
	profileData: UserProfileData
): Promise<{ success: boolean; error?: string; user?: User }> {
	try {
		// Use service role client to bypass RLS for user profile updates
		const supabaseService = createServiceClient();

		// Update user profile using service role (bypasses RLS)
		const { data: user, error: profileError } = await supabaseService
			.from('users')
			.update({
				display_name: profileData.display_name || null,
				first_name: profileData.first_name || null,
				last_name: profileData.last_name || null,
				avatar_url: profileData.avatar_url || null,
			})
			.eq('id', userId)
			.select()
			.single();

		if (profileError) {
			console.error('Error updating user profile:', profileError.message);
			return { success: false, error: profileError.message };
		}

		return { success: true, user: user as User };
	} catch (error) {
		console.error('Failed to update user profile:', error);
		return { success: false, error: 'An unexpected error occurred' };
	}
}
