import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class UsersService {
	private supabase = createClient();

	async getAuthUser() {
		const { data, error } = await this.supabase.auth.getUser();
		if (error) throw new Error(`Failed to get auth user: ${error.message}`);
		return data.user;
	}

	async getUserProfile(userId: string): Promise<User | null> {
		const { data, error } = await this.supabase.from('users').select('*').eq('id', userId).single();

		if (error) {
			if ((error as any).code === 'PGRST116') return null;
			throw mapServiceError(error, 'fetch');
		}
		return data as User;
	}

	async upsertUserProfile(profile: Partial<User> & { id: string }): Promise<User> {
		const { data, error } = await this.supabase.from('users').upsert(profile).select().single();
		if (error) throw new Error(`Failed to upsert user profile: ${error.message}`);
		return data as User;
	}

	async updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
		const { data, error } = await this.supabase
			.from('users')
			.update(updates)
			.eq('id', id)
			.select()
			.single();
		if (error) throw new Error(`Failed to update user profile: ${error.message}`);
		return data as User;
	}

	async getUsersByOrganisation(organisationId: string): Promise<User[]> {
		// First get all user IDs from organisation_users
		const { data: orgUsers, error: orgError } = await this.supabase
			.from('organisation_users')
			.select('user_id')
			.eq('organisation_id', organisationId);

		if (orgError) {
			throw mapServiceError(orgError, 'fetch');
		}

		if (!orgUsers || orgUsers.length === 0) {
			return [];
		}

		// Extract user IDs
		const userIds = orgUsers.map((ou) => ou.user_id);

		// Then fetch all users with those IDs
		const { data: users, error: usersError } = await this.supabase
			.from('users')
			.select('*')
			.in('id', userIds);

		if (usersError) {
			throw mapServiceError(usersError, 'fetch');
		}

		return users || [];
	}

	subscribeToUser(userId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`user-${userId}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
				callback
			)
			.subscribe();
	}
}

export const usersService = new UsersService();
