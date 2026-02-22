import { createClient } from '@/lib/supabase/client';
import type { ApiToken } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class ApiTokensService {
	private supabase = createClient();

	async getTokens(
		userId: string
	): Promise<Pick<ApiToken, 'id' | 'name' | 'token_prefix' | 'last_used_at' | 'created_at'>[]> {
		const { data, error } = await this.supabase
			.from('api_tokens')
			.select('id, name, token_prefix, last_used_at, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	async createToken(
		userId: string,
		organisationId: string,
		name: string
	): Promise<{ token: string; id: string }> {
		// Generate random token: pt_ + 32 random bytes as base64url
		const randomBytes = new Uint8Array(32);
		crypto.getRandomValues(randomBytes);
		const base64url = btoa(String.fromCharCode(...randomBytes))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
		const rawToken = `pt_${base64url}`;

		// SHA-256 hash
		const encoder = new TextEncoder();
		const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

		// Prefix for display: first 8 chars after pt_
		const tokenPrefix = rawToken.substring(0, 11) + '...';

		const { data, error } = await this.supabase
			.from('api_tokens')
			.insert({
				user_id: userId,
				organisation_id: organisationId,
				name,
				token_hash: tokenHash,
				token_prefix: tokenPrefix,
			})
			.select('id')
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return { token: rawToken, id: data.id };
	}

	async deleteToken(tokenId: string): Promise<void> {
		const { error } = await this.supabase.from('api_tokens').delete().eq('id', tokenId);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}
}

export const apiTokensService = new ApiTokensService();
