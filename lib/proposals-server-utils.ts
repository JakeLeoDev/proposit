import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getUser } from '@/lib/auth';
import {
	checkProposalAccess,
	markProposalAsRead,
	isBotRequest,
} from '@/lib/proposal-access-service';
import { getProposalWithRelations } from '@/lib/proposals-server';
import type { ProposalRelations } from '@/components/viewer/contexts/ProposalContext';

export interface ProposalPageData {
	proposalData: ProposalRelations;
	token: string | null;
	isActualPreview: boolean;
}

/**
 * Loads and validates proposal page data
 * Handles user authentication, access checking, and data fetching
 * @param proposalId - The ID of the proposal to load
 * @param preview - Optional preview query parameter
 * @param token - Optional access token
 * @returns ProposalPageData object with proposal data, token, and preview status
 * @throws notFound() if access is denied
 */
export async function loadProposalPageData(
	proposalId: string,
	preview?: string,
	token?: string
): Promise<ProposalPageData> {
	// Get current user if authenticated (only if no token provided)
	let userId: string | null = null;
	if (!token) {
		const user = await getUser();
		userId = user?.id || null;
	}

	// Check access using the service
	const { hasAccess, isPreview } = await checkProposalAccess(proposalId, userId, token || null);

	if (!hasAccess) {
		notFound();
	}

	// Determine if this is preview mode (authenticated user with preview=true)
	const isActualPreview = isPreview && preview === 'true';

	// Fetch proposal data with all relations
	const proposalData = await getProposalWithRelations(proposalId, isActualPreview);

	// Mark proposal as read if it's token access and status is 'Sent'
	// Only mark as read if it's not a bot/crawler request
	if (!isActualPreview && token && proposalData.proposal.status === 'Sent') {
		const headersList = await headers();
		const userAgent = headersList.get('user-agent');

		// Only mark as read if it's not a bot request
		if (!isBotRequest(userAgent)) {
			await markProposalAsRead(proposalId);
		}
	}

	return {
		proposalData,
		token: token || null,
		isActualPreview,
	};
}
