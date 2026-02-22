import { tool } from 'ai';
import { z } from 'zod';
import type { Proposal } from '@/lib/types';
import { proposalNumberService } from '@/lib/proposal-number-service';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';
import { getDefaultContent } from '@/lib/lexical-config';

const PROPOSAL_LIST_SELECT =
	'id, name, internal_name, status, proposal_number, expiry_date, ' +
	'company, recipient, preparator, qualification, certificate, attachment, ' +
	'organisation_id, created_at';

const DESCRIPTIONS = {
	tools: {
		getProposalsList:
			'Get all proposals (without content field — use getProposal to retrieve the full content of a specific proposal)',
		getProposal: 'Get a single proposal by Proposal ID',
		createProposal:
			'Create a new proposal for a company with a contact person. Content must use Lexical format with product-collection-block nodes for displaying product collections.',
		updateProposal:
			'Update an existing proposal by Proposal ID. Content must use Lexical format with product-collection-block nodes for displaying product collections. CRITICAL: When updating content, you MUST first fetch the current proposal using getProposal, preserve all existing sections/modules, and only modify the specific section requested. Never replace the entire content unless explicitly asked.',
		deleteProposal: 'Delete a proposal',
	},
	fields: {
		id: '',
		status: '',
		name: '',
		internal_name: '',
		company: '',
		recipient: '',
		preparator: '',
		content: '',
		expiry_date: '',
		qualification: '',
		certificate: '',
		attachment: '',
	},
};

export function createProposalsTools(context: ToolContext) {
	const { organisationId, userId, supabase, onFieldChange } = context;

	return {
		getProposalsList: tool({
			description: DESCRIPTIONS.tools.getProposalsList,
			inputSchema: z.object({}),
			execute: async () => {
				try {
					const { data, error } = await supabase
						.from('proposals')
						.select(PROPOSAL_LIST_SELECT)
						.eq('organisation_id', organisationId)
						.order('created_at', { ascending: false });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						proposals: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getProposal: tool({
			description: DESCRIPTIONS.tools.getProposal,
			inputSchema: z.object({
				id: z.string().uuid('Proposal ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('proposals')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Proposal not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						proposal: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createProposal: tool({
			description: DESCRIPTIONS.tools.createProposal,
			inputSchema: z.object({
				name: z.string().min(1, 'Proposal name is required').describe(DESCRIPTIONS.fields.name),
				internal_name: z.string().optional().nullable().describe(DESCRIPTIONS.fields.internal_name),
				company: z.string().uuid('Company ID is required').describe(DESCRIPTIONS.fields.company),
				recipient: z
					.string()
					.uuid('Recipient (person) ID is required')
					.describe(DESCRIPTIONS.fields.recipient),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
				expiry_date: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.optional()
					.describe(DESCRIPTIONS.fields.expiry_date),
				status: z
					.enum(['Draft', 'Sent', 'Read', 'Accepted', 'Rejected'])
					.default('Draft')
					.describe(DESCRIPTIONS.fields.status),
				qualification: z
					.string()
					.uuid()
					.optional()
					.nullable()
					.describe(DESCRIPTIONS.fields.qualification),
				certificate: z.string().uuid().optional().nullable().describe(DESCRIPTIONS.fields.certificate),
				attachment: z.string().uuid().optional().nullable().describe(DESCRIPTIONS.fields.attachment),
			}),
			execute: async (input) => {
				try {
					// Generate proposal number
					let proposalNumber: string | null = null;
					try {
						proposalNumberService.setSupabaseClient(supabase);
						proposalNumber = await proposalNumberService.generateProposalNumber(organisationId);
					} catch (error) {
						console.warn('Failed to generate proposal number:', error);
						// Use "XXX" as placeholder as requested
						proposalNumber = 'XXX';
					}

					// Set default expiry date (14 days from now)
					const defaultExpiryDate = new Date();
					defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 14);
					const expiryDate = input.expiry_date || defaultExpiryDate.toISOString().split('T')[0];

					// Use content as-is or default content (validation moved to client-side)
					let proposalContent = getDefaultContent();
					if (input.content !== undefined && input.content !== null) {
						proposalContent = input.content;
					}

					const { data, error } = await supabase
						.from('proposals')
						.insert({
							name: input.name,
							internal_name: input.internal_name || null,
							company: input.company,
							recipient: input.recipient,
							preparator: userId, // Automatically set to the user making the request
							content: JSON.stringify(proposalContent),
							expiry_date: expiryDate,
							status: input.status || 'Draft',
							proposal_number: proposalNumber,
							qualification: input.qualification || null,
							certificate: input.certificate || null,
							attachment: input.attachment || null,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						console.error('Proposal insert error:', error);
						return {
							success: false,
							error: error.message || 'Failed to create proposal',
						};
					}

					if (!data) {
						console.error('Proposal insert returned no data');
						return {
							success: false,
							error: 'Failed to create proposal: No data returned',
						};
					}

					triggerFieldChange(onFieldChange, 'id', data.id);

					return {
						success: true,
						proposal: data as Proposal,
						message: 'Proposal created successfully',
					};
				} catch (error) {
					console.error('Unexpected error in createProposal:', error);
					return handleToolError(error);
				}
			},
		}),

		updateProposal: tool({
			description: DESCRIPTIONS.tools.updateProposal,
			inputSchema: z.object({
				id: z.string().uuid('Proposal ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				internal_name: z.string().optional().nullable().describe(DESCRIPTIONS.fields.internal_name),
				company: z.string().uuid().optional().describe(DESCRIPTIONS.fields.company),
				recipient: z.string().uuid().optional().describe(DESCRIPTIONS.fields.recipient),
				preparator: z.string().uuid().optional().describe(DESCRIPTIONS.fields.preparator),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
				expiry_date: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.optional()
					.describe(DESCRIPTIONS.fields.expiry_date),
				status: z
					.enum(['Draft', 'Sent', 'Read', 'Accepted', 'Rejected'])
					.optional()
					.describe(DESCRIPTIONS.fields.status),
				qualification: z
					.string()
					.uuid()
					.optional()
					.nullable()
					.describe(DESCRIPTIONS.fields.qualification),
				certificate: z.string().uuid().optional().nullable().describe(DESCRIPTIONS.fields.certificate),
				attachment: z.string().uuid().optional().nullable().describe(DESCRIPTIONS.fields.attachment),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<Proposal> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							// Stringify content field (validation moved to client-side)
							if (key === 'content') {
								cleanUpdates[key as keyof Proposal] = JSON.stringify(value) as any;
							} else {
								cleanUpdates[key as keyof Proposal] = value as any;
							}
						}
					});

					const { data, error } = await supabase
						.from('proposals')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					// Trigger field changes for updated fields
					Object.keys(updates).forEach((key) => {
						triggerFieldChange(onFieldChange, key, (data as any)[key]);
					});

					return {
						success: true,
						proposal: data as Proposal,
						message: 'Proposal updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteProposal: tool({
			description: DESCRIPTIONS.tools.deleteProposal,
			inputSchema: z.object({
				id: z.string().uuid('Proposal ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('proposals').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Proposal deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
