import { createClient } from '@/lib/supabase/client';
import type { Proposal } from '@/lib/types';
import { proposalNumberService } from '@/lib/proposal-number-service';
import { proposalVersionsService } from '@/lib/proposal-versions-service';
import { getDefaultContent, validateLexicalContent, extractImagePaths } from '@/lib/lexical-config';
import { toast } from 'sonner';
import { mapServiceError } from '@/lib/error-utils';

export class ProposalsService {
	private supabase = createClient();

	// Get all proposals for an organization
	async getProposals(organisationId: string): Promise<Proposal[]> {
		const { data, error } = await this.supabase
			.from('proposals')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single proposal by ID
	async getProposal(id: string): Promise<Proposal | null> {
		const { data, error } = await this.supabase.from('proposals').select('*').eq('id', id).single();

		if (error) {
			if ((error as any).code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new proposal
	async createProposal(proposal: Omit<Proposal, 'id' | 'created_at'>): Promise<Proposal> {
		// Set expiry date to 2 weeks from now if not provided
		const defaultExpiryDate = new Date();
		defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 14);
		const defaultExpiryDateString = defaultExpiryDate.toISOString().split('T')[0];

		// Generate proposal number if not provided
		let proposalNumber = proposal.proposal_number;
		if (!proposalNumber) {
			try {
				proposalNumberService.setSupabaseClient(this.supabase);
				proposalNumber = await proposalNumberService.generateProposalNumber(proposal.organisation_id);
			} catch (error) {
				console.warn('Failed to generate proposal number:', error);
				// Fallback to "XXX" as placeholder
				proposalNumber = 'XXX';
			}
		}

		// Validate and ensure content is in Lexical format
		let proposalContent: unknown = getDefaultContent();
		if (proposal.content !== undefined && proposal.content !== null) {
			// Parse content if it's a string (from database)
			let contentToValidate = proposal.content;
			if (typeof proposal.content === 'string') {
				try {
					contentToValidate = JSON.parse(proposal.content);
				} catch {
					throw new Error('Invalid content format: Content must be valid JSON');
				}
			}

			// Validate content first
			const validationResult = validateLexicalContent(contentToValidate);
			if (!validationResult.valid) {
				throw new Error(
					`Invalid Lexical content: ${validationResult.error || 'The returned value does not have the correct lexical value.'}`
				);
			}
			// Use validated content directly
			proposalContent = contentToValidate;
		}

		const proposalWithDefaults = {
			...proposal,
			content: proposalContent,
			expiry_date: proposal.expiry_date ?? defaultExpiryDateString,
			proposal_number: proposalNumber,
		};

		const { data, error } = await this.supabase
			.from('proposals')
			.insert(proposalWithDefaults)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data as Proposal;
	}

	// Update an existing proposal
	async updateProposal(
		id: string,
		updates: Partial<Omit<Proposal, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Proposal> {
		// Get current proposal before updating
		const currentProposal = await this.getProposal(id);
		if (!currentProposal) {
			throw new Error('Proposal not found');
		}

		// Create a version of the current proposal before updating
		try {
			await proposalVersionsService.createVersion(currentProposal);
		} catch (error) {
			// Log error but don't fail the update if versioning fails
			console.warn('Failed to create proposal version:', error);
		}

		// Validate content if it's being updated
		const validatedUpdates = { ...updates };
		if (updates.content !== undefined && updates.content !== null) {
			// Parse content if it's a string (from database)
			let contentToValidate = updates.content;
			if (typeof updates.content === 'string') {
				try {
					contentToValidate = JSON.parse(updates.content);
				} catch {
					throw new Error('Invalid content format: Content must be valid JSON');
				}
			}

			toast.info('Validating content...');
			// Validate content first
			const validationResult = validateLexicalContent(contentToValidate);
			if (!validationResult.valid) {
				toast.error('Invalid Lexical content');
				throw new Error(
					`Invalid Lexical content: ${validationResult.error || 'The returned value does not have the correct lexical value.'}`
				);
			}
			// Use validated content directly
			validatedUpdates.content = contentToValidate;
		}

		// Update the proposal
		const { data, error } = await this.supabase
			.from('proposals')
			.update(validatedUpdates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		const updatedProposal = data as Proposal;

		// Sync image references after successful update (non-blocking)
		if (updates.content !== undefined) {
			try {
				await this.syncProposalImages(id, updatedProposal.organisation_id, updatedProposal.content);
			} catch (err) {
				console.warn('Failed to sync proposal images:', err);
			}
		}

		return updatedProposal;
	}

	// Delete a proposal
	async deleteProposal(id: string): Promise<void> {
		// Delete storage files before DB delete (rows are CASCADE-deleted)
		try {
			await this.deleteProposalImages(id);
		} catch (err) {
			console.warn('Failed to delete proposal images from storage:', err);
		}

		const { error } = await this.supabase.from('proposals').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	/**
	 * Syncs the proposal_images tracking table with the actual images in content.
	 * Inserts new references, removes orphaned ones, and deletes orphaned storage files.
	 */
	private async syncProposalImages(
		proposalId: string,
		organisationId: string,
		content: unknown
	): Promise<void> {
		const currentPaths = extractImagePaths(content);

		// Load existing tracked paths
		const { data: existingRows, error: fetchError } = await this.supabase
			.from('proposal_images')
			.select('storage_path')
			.eq('proposal_id', proposalId);

		if (fetchError) {
			throw mapServiceError(fetchError, 'fetch');
		}

		const existingPaths = new Set((existingRows || []).map((r) => r.storage_path));
		const currentPathsSet = new Set(currentPaths);

		// New paths to insert
		const toInsert = currentPaths.filter((p) => !existingPaths.has(p));
		// Orphaned paths to remove
		const toRemove = [...existingPaths].filter((p) => !currentPathsSet.has(p));

		// Insert new tracking rows
		if (toInsert.length > 0) {
			const rows = toInsert.map((storage_path) => ({
				proposal_id: proposalId,
				organisation_id: organisationId,
				storage_path,
			}));
			const { error: insertError } = await this.supabase.from('proposal_images').insert(rows);
			if (insertError) {
				console.warn('Failed to insert proposal image rows:', insertError);
			}
		}

		// Delete orphaned storage files and tracking rows
		if (toRemove.length > 0) {
			// storage_path values are relative paths within the 'Media' bucket
			// (e.g. "organisations/{orgId}/editor-images/1234567.png")
			await this.supabase.storage.from('Media').remove(toRemove);

			// Delete tracking rows
			await this.supabase
				.from('proposal_images')
				.delete()
				.eq('proposal_id', proposalId)
				.in('storage_path', toRemove);
		}
	}

	/**
	 * Deletes all storage files associated with a proposal.
	 * Called before proposal deletion (DB rows are CASCADE-deleted).
	 */
	private async deleteProposalImages(proposalId: string): Promise<void> {
		const { data: rows, error } = await this.supabase
			.from('proposal_images')
			.select('storage_path')
			.eq('proposal_id', proposalId);

		if (error || !rows || rows.length === 0) return;

		// storage_path values are relative paths within the 'Media' bucket
		const filePaths = rows.map((r) => r.storage_path);
		await this.supabase.storage.from('Media').remove(filePaths);
	}

	// Subscribe to real-time changes for proposals
	subscribeToProposals(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('proposals-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'proposals',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific proposal
	subscribeToProposal(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`proposal-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'proposals',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const proposalsService = new ProposalsService();
