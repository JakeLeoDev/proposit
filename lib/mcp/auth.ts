import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

export async function authenticateToken(
	request: Request
): Promise<{ userId: string; organisationId: string } | null> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return null;
	}

	const rawToken = authHeader.slice(7);
	if (!rawToken.startsWith('pt_')) {
		return null;
	}

	const tokenHash = createHash('sha256').update(rawToken).digest('hex');

	const serviceClient = createServiceClient();

	const { data, error } = await serviceClient
		.from('api_tokens')
		.select('user_id, organisation_id')
		.eq('token_hash', tokenHash)
		.single();

	if (error || !data) {
		return null;
	}

	// Update last_used_at fire-and-forget
	serviceClient
		.from('api_tokens')
		.update({ last_used_at: new Date().toISOString() })
		.eq('token_hash', tokenHash)
		.then();

	return { userId: data.user_id, organisationId: data.organisation_id };
}
