import { createServiceClient } from '@/lib/supabase/server';

export interface AccessResult {
	hasAccess: boolean;
	isPreview: boolean;
}

/**
 * Validates token-based access to a proposal
 * Checks if token exists, is not expired, and matches the proposal
 */
export async function validateTokenAccess(proposalId: string, token: string): Promise<boolean> {
	try {
		const supabase = createServiceClient();
		const { data: link, error } = await supabase
			.from('links')
			.select('exp_date')
			.eq('proposal_id', proposalId)
			.eq('token', token)
			.maybeSingle();

		if (error || !link) return false;

		// Check if token is expired
		if (new Date(link.exp_date) < new Date()) return false;

		return true;
	} catch (error) {
		console.error('Error validating token access:', error);
		return false;
	}
}

/**
 * Validates user-based access to a proposal
 * Checks if user belongs to the organisation that owns the proposal
 */
export async function validateUserAccess(proposalId: string, userId: string): Promise<boolean> {
	try {
		const supabase = createServiceClient();

		// First get the proposal's organisation_id
		const { data: proposal, error: proposalError } = await supabase
			.from('proposals')
			.select('organisation_id')
			.eq('id', proposalId)
			.single();

		if (proposalError || !proposal) return false;

		// Check if user belongs to the organisation
		const { data: membership, error: membershipError } = await supabase
			.from('organisation_users')
			.select('organisation_id')
			.eq('user_id', userId)
			.eq('organisation_id', proposal.organisation_id)
			.maybeSingle();

		if (membershipError || !membership) return false;

		return true;
	} catch (error) {
		console.error('Error validating user access:', error);
		return false;
	}
}

/**
 * Combined access check that validates either token or user access
 * Returns access status and whether it's preview mode
 */
export async function checkProposalAccess(
	proposalId: string,
	userId: string | null,
	token: string | null
): Promise<AccessResult> {
	// If we have a token, validate token access
	if (token) {
		const hasTokenAccess = await validateTokenAccess(proposalId, token);
		return {
			hasAccess: hasTokenAccess,
			isPreview: false, // Token access is never preview mode
		};
	}

	// If we have a user ID, validate user access
	if (userId) {
		const hasUserAccess = await validateUserAccess(proposalId, userId);
		return {
			hasAccess: hasUserAccess,
			isPreview: hasUserAccess, // User access allows preview mode
		};
	}

	// No token and no user - no access
	return {
		hasAccess: false,
		isPreview: false,
	};
}

/**
 * Checks if the request is from a bot/crawler based on User-Agent header
 * @param userAgent - The User-Agent header value
 * @returns true if the request is from a bot/crawler
 */
export function isBotRequest(userAgent: string | null): boolean {
	if (!userAgent) {
		// If no User-Agent is provided, assume it's a bot
		return true;
	}

	const ua = userAgent.toLowerCase();

	// Common bot/crawler patterns
	const botPatterns = [
		// Search engine crawlers
		'googlebot',
		'bingbot',
		'slurp', // Yahoo
		'duckduckbot',
		'baiduspider',
		'yandexbot',
		'sogou',
		'exabot',
		'facebot',
		'ia_archiver',

		// Social media crawlers
		'facebookexternalhit',
		'twitterbot',
		'linkedinbot',
		'whatsapp',
		'telegrambot',
		'skypeuripreview',
		'discordbot',

		// Other common bots
		'bot',
		'crawler',
		'spider',
		'scraper',
		'curl',
		'wget',
		'python-requests',
		'go-http-client',
		'java',
		'node-fetch',
		'axios',
		'postman',
		'insomnia',
		'httpie',
		'okhttp',

		// Monitoring and testing tools
		'pingdom',
		'uptimerobot',
		'monitor',
		'check',
		'test',

		// Email clients (often crawl links)
		'outlook',
		'thunderbird',
		'mail',
		'email',
	];

	return botPatterns.some((pattern) => ua.includes(pattern));
}

/**
 * Updates proposal status from 'Sent' to 'Read' for token-based access
 * Only called for non-preview token access
 */
export async function markProposalAsRead(proposalId: string): Promise<void> {
	try {
		const supabase = createServiceClient();
		await supabase
			.from('proposals')
			.update({ status: 'Read' })
			.eq('id', proposalId)
			.eq('status', 'Sent');
	} catch (error) {
		console.error('Error marking proposal as read:', error);
		// Don't throw - this is not critical for the user experience
	}
}
