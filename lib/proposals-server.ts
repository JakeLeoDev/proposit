import { createServiceClient } from '@/lib/supabase/server';
import type { ProposalRelations } from '@/components/viewer/contexts/ProposalContext';
import type { ProductCollection, ProductItem } from '@/lib/types';

/**
 * Server-side function to get proposal with all related data
 * This function uses the service client and should only be called from server components
 */
export async function getProposalWithRelations(
	proposalId: string,
	includeDraft: boolean = false
): Promise<ProposalRelations> {
	const supabase = createServiceClient();

	// Get the proposal
	const query = supabase.from('proposals').select('*').eq('id', proposalId).limit(1);
	if (!includeDraft) query.in('status', ['Sent', 'Read', 'Accepted', 'Rejected']);
	const { data: proposal, error: pErr } = await query.maybeSingle();

	if (pErr || !proposal) {
		throw new Error('Unauthorized');
	}

	const organisationId = proposal.organisation_id as string;
	const companyId = proposal.company as string | null;
	const recipientId = proposal.recipient as string | null;
	const qualificationId = proposal.qualification as string | null;
	const certificateId = proposal.certificate as string | null;
	const attachmentId = proposal.attachment as string | null;
	const preparatorId = proposal.preparator as string | null;

	// Fetch all related entities in parallel
	const [orgRes, compRes, recRes, qualRes, certRes, attRes, prepRes, collectionsRes] =
		await Promise.all([
			supabase.from('organisations').select('*').eq('id', organisationId).maybeSingle(),
			companyId
				? supabase.from('companies').select('*').eq('id', companyId).maybeSingle()
				: Promise.resolve({ data: null }),
			recipientId
				? supabase.from('persons').select('*').eq('id', recipientId).maybeSingle()
				: Promise.resolve({ data: null }),
			qualificationId
				? supabase.from('qualifications').select('*').eq('id', qualificationId).maybeSingle()
				: Promise.resolve({ data: null }),
			certificateId
				? supabase.from('certificates').select('*').eq('id', certificateId).maybeSingle()
				: Promise.resolve({ data: null }),
			attachmentId
				? supabase.from('attachments').select('*').eq('id', attachmentId).maybeSingle()
				: Promise.resolve({ data: null }),
			preparatorId
				? supabase.from('users').select('*').eq('id', preparatorId).maybeSingle()
				: Promise.resolve({ data: null }),
			supabase
				.from('product_collections')
				.select('*')
				.eq('proposal_id', proposalId)
				.order('created_at', { ascending: false }),
		]);

	// Fetch product items for each collection
	const collections = (collectionsRes.data as ProductCollection[]) || [];
	const collectionsWithItems: (ProductCollection & { items: ProductItem[] })[] = [];

	if (collections.length > 0) {
		const collectionIds = collections.map((c) => c.id);
		const { data: itemsData, error: itemsError } = await supabase
			.from('product_items')
			.select('*')
			.in('product_collection_id', collectionIds)
			.order('position', { ascending: true })
			.order('created_at', { ascending: true });

		if (itemsError) {
			// Log error but continue without items
		}

		const items = (itemsData as ProductItem[]) || [];

		// Group items by collection
		collections.forEach((collection) => {
			const collectionItems = items.filter((item) => item.product_collection_id === collection.id);
			collectionsWithItems.push({
				...collection,
				items: collectionItems,
			});
		});
	}

	const relations: ProposalRelations = {
		proposal: proposal as any,
		organisation: (orgRes.data as any) || null,
		company: (compRes as any).data || null,
		recipient: (recRes as any).data || null,
		qualification: (qualRes as any).data || null,
		certificate: (certRes as any).data || null,
		attachment: (attRes as any).data || null,
		preparator: (prepRes as any).data || null,
		productCollections: collectionsWithItems,
	};

	return relations;
}
