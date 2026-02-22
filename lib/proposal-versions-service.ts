import { createClient } from '@/lib/supabase/client';
import type { ProposalVersion, Proposal } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class ProposalVersionsService {
	private supabase = createClient();

	// Get all versions for a proposal
	async getVersions(proposalId: string): Promise<ProposalVersion[]> {
		const { data, error } = await this.supabase
			.from('proposal_versions')
			.select('*')
			.eq('proposal_id', proposalId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single version by ID
	async getVersion(id: string): Promise<ProposalVersion | null> {
		const { data, error } = await this.supabase
			.from('proposal_versions')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if ((error as any).code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new version from a proposal
	async createVersion(proposal: Proposal): Promise<ProposalVersion> {
		// Get the next version number for this proposal
		const existingVersions = await this.getVersions(proposal.id);
		const nextVersionNumber =
			existingVersions.length > 0 ? Math.max(...existingVersions.map((v) => v.version_number)) + 1 : 1;

		const versionData: Omit<ProposalVersion, 'id' | 'created_at'> = {
			proposal_id: proposal.id,
			version_number: nextVersionNumber,
			name: proposal.name,
			internal_name: proposal.internal_name,
			content: proposal.content,
			attachment: proposal.attachment,
			expiry_date: proposal.expiry_date,
			status: proposal.status,
			proposal_number: proposal.proposal_number,
			organisation_id: proposal.organisation_id,
			company: proposal.company,
			qualification: proposal.qualification,
			certificate: proposal.certificate,
			recipient: proposal.recipient,
			preparator: proposal.preparator,
			// Note: online_signature is not included as it doesn't exist in the proposals table schema
		};

		const { data, error } = await this.supabase
			.from('proposal_versions')
			.insert(versionData)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Delete all versions created after a specific timestamp
	async deleteVersionsAfter(proposalId: string, versionCreatedAt: string): Promise<void> {
		const { error } = await this.supabase
			.from('proposal_versions')
			.delete()
			.eq('proposal_id', proposalId)
			.gt('created_at', versionCreatedAt);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Revert proposal to a specific version
	async revertToVersion(proposalId: string, versionId: string): Promise<Proposal> {
		// Get the version to revert to
		const version = await this.getVersion(versionId);
		if (!version) {
			throw new Error('Version not found');
		}

		if (version.proposal_id !== proposalId) {
			throw new Error('Version does not belong to this proposal');
		}

		// Import proposalsService here to avoid circular dependency
		const { proposalsService } = await import('@/lib/proposals-service');

		// Update the proposal with version data
		// Note: online_signature is excluded as it doesn't exist in the proposals table schema
		const updatedProposal = await proposalsService.updateProposal(proposalId, {
			name: version.name,
			internal_name: version.internal_name,
			content: version.content,
			attachment: version.attachment,
			expiry_date: version.expiry_date,
			status: version.status,
			proposal_number: version.proposal_number,
			company: version.company,
			qualification: version.qualification,
			certificate: version.certificate,
			recipient: version.recipient,
			preparator: version.preparator,
		});

		// Delete all versions created after this version
		await this.deleteVersionsAfter(proposalId, version.created_at);

		return updatedProposal;
	}

	// Subscribe to real-time changes for proposal versions
	subscribeToVersions(proposalId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('proposal-versions-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'proposal_versions',
					filter: `proposal_id=eq.${proposalId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific version
	subscribeToVersion(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`proposal-version-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'proposal_versions',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const proposalVersionsService = new ProposalVersionsService();
