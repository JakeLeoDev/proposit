import { tool } from 'ai';
import { z } from 'zod';
import type { ProductCollection } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getProductCollectionsList: 'Get all product collections for a proposal',
		getProductCollection: 'Get a single product collection by Product Collection ID',
		createProductCollection:
			'Create a one-time product collection for a specific proposal with name, optional template reference, and discount settings. CRITICAL: After creating a product collection, you MUST update the proposals content field to include a product-collection-block node with the collection_id. This is essential for the proposal to display the product collection properly.',
		updateProductCollection: 'Update an existing product collection',
		deleteProductCollection: 'Delete a product collection',
	},
	fields: {
		id: '',
		proposalId: '',
		proposal_id: '',
		name: '',
		description: '',
		collection_reference: '',
		discount: '',
		discount_type: '',
	},
};

export function createProductCollectionsTools(context: ToolContext) {
	const { organisationId, supabase } = context;

	return {
		getProductCollectionsList: tool({
			description: DESCRIPTIONS.tools.getProductCollectionsList,
			inputSchema: z.object({
				proposalId: z.string().uuid('Proposal ID is required').describe(DESCRIPTIONS.fields.proposalId),
			}),
			execute: async ({ proposalId }) => {
				try {
					const { data: proposal } = await supabase
						.from('proposals')
						.select('id')
						.eq('id', proposalId)
						.eq('organisation_id', organisationId)
						.single();

					if (!proposal) {
						return { success: false, error: 'Proposal not found or access denied' };
					}

					const { data, error } = await supabase
						.from('product_collections')
						.select('*')
						.eq('proposal_id', proposalId)
						.order('created_at', { ascending: false });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						collections: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getProductCollection: tool({
			description: DESCRIPTIONS.tools.getProductCollection,
			inputSchema: z.object({
				id: z.string().uuid('Collection ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('product_collections')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Product collection not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						collection: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createProductCollection: tool({
			description: DESCRIPTIONS.tools.createProductCollection,
			inputSchema: z.object({
				proposal_id: z
					.string()
					.uuid('Proposal ID is required')
					.describe(DESCRIPTIONS.fields.proposal_id),
				name: z.string().min(1, 'Collection name is required').describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				collection_reference: z
					.string()
					.uuid()
					.nullable()
					.optional()
					.describe(DESCRIPTIONS.fields.collection_reference),
				discount: z.number().nullable().optional().describe(DESCRIPTIONS.fields.discount),
				discount_type: z.string().nullable().optional().describe(DESCRIPTIONS.fields.discount_type),
			}),
			execute: async (input) => {
				try {
					const { data: proposal } = await supabase
						.from('proposals')
						.select('id')
						.eq('id', input.proposal_id)
						.eq('organisation_id', organisationId)
						.single();

					if (!proposal) {
						return { success: false, error: 'Proposal not found or access denied' };
					}

					// If collection_reference is provided, verify it belongs to organisation
					if (input.collection_reference) {
						const { data: template } = await supabase
							.from('product_collections_templates')
							.select('id')
							.eq('id', input.collection_reference)
							.eq('organisation_id', organisationId)
							.single();

						if (!template) {
							return { success: false, error: 'Collection template not found or access denied' };
						}
					}

					const { data, error } = await supabase
						.from('product_collections')
						.insert({
							proposal_id: input.proposal_id,
							name: input.name,
							description: input.description || null,
							collection_reference: input.collection_reference || null,
							discount: input.discount || null,
							discount_type: input.discount_type || null,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						collection: data as ProductCollection,
						message: 'Product collection created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateProductCollection: tool({
			description: DESCRIPTIONS.tools.updateProductCollection,
			inputSchema: z.object({
				id: z.string().uuid('Collection ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				discount: z.number().nullable().optional().describe(DESCRIPTIONS.fields.discount),
				discount_type: z.string().nullable().optional().describe(DESCRIPTIONS.fields.discount_type),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<ProductCollection> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							cleanUpdates[key as keyof ProductCollection] = value as any;
						}
					});

					const { data, error } = await supabase
						.from('product_collections')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						collection: data as ProductCollection,
						message: 'Product collection updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteProductCollection: tool({
			description: DESCRIPTIONS.tools.deleteProductCollection,
			inputSchema: z.object({
				id: z.string().uuid('Collection ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('product_collections').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Product collection deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
