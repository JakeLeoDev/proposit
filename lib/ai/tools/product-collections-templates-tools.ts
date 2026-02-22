import { tool } from 'ai';
import { z } from 'zod';
import type { ProductCollectionTemplate } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getProductCollectionsTemplatesList: 'Get all product collection templates',
		getProductCollectionTemplate:
			'Get a single product collection template by Product Collection Template ID',
		createProductCollectionTemplate: 'Create a new product collection template',
		updateProductCollectionTemplate: 'Update an existing product collection template',
		deleteProductCollectionTemplate: 'Delete a product collection template',
	},
	fields: {
		id: '',
		categoryId: '',
		name: '',
		description: '',
		category: '',
		iternal_name: '',
		internal_notes: '',
		discount: '',
		discount_type: '',
	},
};

export function createProductCollectionsTemplatesTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getProductCollectionsTemplatesList: tool({
			description: DESCRIPTIONS.tools.getProductCollectionsTemplatesList,
			inputSchema: z.object({
				categoryId: z.string().uuid().optional().describe(DESCRIPTIONS.fields.categoryId),
			}),
			execute: async ({ categoryId }) => {
				try {
					let query = supabase
						.from('product_collections_templates')
						.select('*')
						.eq('organisation_id', organisationId);

					if (categoryId) {
						query = query.eq('category', categoryId);
					}

					const { data, error } = await query.order('created_at', { ascending: false });

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

		getProductCollectionTemplate: tool({
			description: DESCRIPTIONS.tools.getProductCollectionTemplate,
			inputSchema: z.object({
				id: z
					.string()
					.uuid('Collection template ID must be a valid UUID')
					.describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('product_collections_templates')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Product collection template not found' };
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

		createProductCollectionTemplate: tool({
			description: DESCRIPTIONS.tools.createProductCollectionTemplate,
			inputSchema: z.object({
				name: z.string().min(1, 'Collection name is required').describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				category: z.string().uuid('Category ID is required').describe(DESCRIPTIONS.fields.category),
				iternal_name: z.string().nullable().optional().describe(DESCRIPTIONS.fields.iternal_name),
				internal_notes: z.string().nullable().optional().describe(DESCRIPTIONS.fields.internal_notes),
				discount: z.string().nullable().optional().describe(DESCRIPTIONS.fields.discount),
				discount_type: z.string().nullable().optional().describe(DESCRIPTIONS.fields.discount_type),
			}),
			execute: async (input) => {
				try {
					const { data, error } = await supabase
						.from('product_collections_templates')
						.insert({
							name: input.name,
							description: input.description || null,
							category: input.category,
							iternal_name: input.iternal_name || null,
							internal_notes: input.internal_notes || null,
							discount: input.discount || null,
							discount_type: input.discount_type || null,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'collection_reference', data.id);

					return {
						success: true,
						collection: data as ProductCollectionTemplate,
						message: 'Product collection template created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateProductCollectionTemplate: tool({
			description: DESCRIPTIONS.tools.updateProductCollectionTemplate,
			inputSchema: z.object({
				id: z
					.string()
					.uuid('Collection template ID must be a valid UUID')
					.describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				category: z.string().uuid().optional().describe(DESCRIPTIONS.fields.category),
				iternal_name: z.string().nullable().optional().describe(DESCRIPTIONS.fields.iternal_name),
				internal_notes: z.string().nullable().optional().describe(DESCRIPTIONS.fields.internal_notes),
				discount: z.string().nullable().optional().describe(DESCRIPTIONS.fields.discount),
				discount_type: z.string().nullable().optional().describe(DESCRIPTIONS.fields.discount_type),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<ProductCollectionTemplate> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							cleanUpdates[key as keyof ProductCollectionTemplate] = value as any;
						}
					});

					const { data, error } = await supabase
						.from('product_collections_templates')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						collection: data as ProductCollectionTemplate,
						message: 'Product collection template updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteProductCollectionTemplate: tool({
			description: DESCRIPTIONS.tools.deleteProductCollectionTemplate,
			inputSchema: z.object({
				id: z
					.string()
					.uuid('Collection template ID must be a valid UUID')
					.describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('product_collections_templates').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Product collection template deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
