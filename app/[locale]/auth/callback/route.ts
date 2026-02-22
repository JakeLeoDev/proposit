import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get('code');
	const error = searchParams.get('error');
	const error_description = searchParams.get('error_description');
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

	if (!baseUrl) {
		console.error('NEXT_PUBLIC_APP_URL is not configured');
		return NextResponse.json({ error: 'Application URL is not configured' }, { status: 500 });
	}

	const locale = request.nextUrl.pathname.split('/')[1]; // Extract locale from path

	// Handle error from Supabase
	if (error) {
		console.error('Auth callback error:', error, error_description);
		return NextResponse.redirect(
			`${baseUrl}/${locale}/auth/login?error=${encodeURIComponent(error_description || error)}`
		);
	}

	if (code) {
		const cookieStore = await cookies();
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
						try {
							cookiesToSet.forEach(
								({ name, value, options }: { name: string; value: string; options?: any }) => {
									cookieStore.set(name, value, options);
								}
							);
						} catch {
							// The `set` method was called from a Server Component.
							// This can be ignored if you have middleware refreshing
							// user sessions.
						}
					},
				},
			}
		);

		// Exchange the code for a session
		const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			console.error('Error exchanging code for session:', exchangeError.message);
			return NextResponse.redirect(
				`${baseUrl}/${locale}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
			);
		}

		// Get the authenticated user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.redirect(
				`${baseUrl}/${locale}/auth/login?error=${encodeURIComponent('User not found')}`
			);
		}

		// Check if email is confirmed
		if (!user.email_confirmed_at) {
			// Sign out the user if email is not confirmed
			await supabase.auth.signOut();
			return NextResponse.redirect(
				`${baseUrl}/${locale}/auth/login?error=${encodeURIComponent('Please confirm your email address before signing in')}`
			);
		}

		// Invitation processing is now handled directly in the signup form
		// No need to process invitations here anymore

		// Successfully authenticated, redirect to dashboard
		return NextResponse.redirect(`${baseUrl}/${locale}/dashboard`);
	}

	// No code provided, redirect to login
	return NextResponse.redirect(`${baseUrl}/${locale}/auth/login`);
}
