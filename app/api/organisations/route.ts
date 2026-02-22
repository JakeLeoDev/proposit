import { getUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { getFieldHint } from '@/lib/encrypted-fields';

export async function PATCH(request: Request) {
	try {
		const user = await getUser();
		if (!user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Verify organisation membership
		const serviceClient = createServiceClient();
		const { data: membership, error: membershipError } = await serviceClient
			.from('organisation_users')
			.select('organisation_id')
			.eq('user_id', user.id)
			.maybeSingle();

		if (membershipError || !membership) {
			return new Response(JSON.stringify({ error: 'No organisation found' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();
		const {
			ai_api_key,
			ai_feature,
			ai_system_prompt,
			smtp_enabled,
			smtp_host,
			smtp_port,
			smtp_user,
			smtp_pass,
			smtp_from,
			smtp_secure,
		} = body;

		const updates: Record<string, any> = {};

		if (typeof ai_feature === 'boolean') {
			updates.ai_feature = ai_feature;
		}

		if (ai_system_prompt !== undefined) {
			updates.ai_system_prompt =
				typeof ai_system_prompt === 'string' && ai_system_prompt.trim() ? ai_system_prompt : null;
		}

		if (ai_api_key !== undefined) {
			if (typeof ai_api_key === 'string' && ai_api_key.trim()) {
				const plainKey = ai_api_key.trim();
				updates.ai_api_key = encrypt(plainKey);
				updates.ai_api_key_hint = getFieldHint(plainKey);
			} else {
				// Key was cleared
				updates.ai_api_key = null;
				updates.ai_api_key_hint = null;
			}
		}

		if (typeof smtp_enabled === 'boolean') {
			updates.smtp_enabled = smtp_enabled;
		}

		if (smtp_host !== undefined) {
			updates.smtp_host = typeof smtp_host === 'string' && smtp_host.trim() ? smtp_host.trim() : null;
		}

		if (smtp_port !== undefined) {
			updates.smtp_port = typeof smtp_port === 'number' ? smtp_port : null;
		}

		if (smtp_user !== undefined) {
			updates.smtp_user = typeof smtp_user === 'string' && smtp_user.trim() ? smtp_user.trim() : null;
		}

		if (smtp_pass !== undefined) {
			if (typeof smtp_pass === 'string' && smtp_pass.trim()) {
				const plainPass = smtp_pass.trim();
				updates.smtp_pass = encrypt(plainPass);
				updates.smtp_pass_hint = getFieldHint(plainPass);
			} else {
				updates.smtp_pass = null;
				updates.smtp_pass_hint = null;
			}
		}

		if (smtp_from !== undefined) {
			updates.smtp_from = typeof smtp_from === 'string' && smtp_from.trim() ? smtp_from.trim() : null;
		}

		if (typeof smtp_secure === 'boolean') {
			updates.smtp_secure = smtp_secure;
		}

		const { data, error } = await serviceClient
			.from('organisations')
			.update(updates)
			.eq('id', membership.organisation_id)
			.select(
				'id, ai_feature, ai_api_key_hint, ai_system_prompt, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_pass_hint, smtp_from, smtp_secure'
			)
			.single();

		if (error) {
			console.error('Failed to update organisation:', error.message);
			return new Response(JSON.stringify({ error: 'Failed to update organisation' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error in organisations API:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal server error',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
