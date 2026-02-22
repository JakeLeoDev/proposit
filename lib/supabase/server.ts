import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
	const cookieStore = await cookies();

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			'Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
		);
	}

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
				try {
					cookiesToSet.forEach(
						({ name, value, options }: { name: string; value: string; options?: any }) =>
							cookieStore.set(name, value, options)
					);
				} catch {
					// The `setAll` method was called from a Server Component.
					// This can be ignored if you have middleware refreshing
					// user sessions.
				}
			},
		},
	});
}

/**
 * Creates a Supabase client with service role key for server-side operations
 * that need full database access without user authentication
 */
export function createServiceClient() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseServiceKey) {
		throw new Error(
			'Missing Supabase service role environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
		);
	}

	return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
