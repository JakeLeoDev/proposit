import { tool } from 'ai';
import { z } from 'zod';
import type { ProductItemTemplate } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getProductItemsTemplatesList: 'Get all product item templates or filter by a specific collection',
		getProductItemTemplate: 'Get a single product item template by Product Item Template ID',
		createProductItemTemplate: 'Create a new product item template',
		updateProductItemTemplate: 'Update an existing product item template',
		deleteProductItemTemplate: 'Delete a product item template',
	},
	fields: {
		id: '',
		collectionId: '',
		collection_id: '',
		name: '',
		description: '',
		unit_price: '',
		unit_type: '',
		iternal_name: '',
		internal_notes: '',
		position: '',
	},
};

export function createProductItemsTemplatesTools(context: ToolContext) {
	const { organisationId, supabase } = context;

	return {
		getProductItemsTemplatesList: tool({
			description: DESCRIPTIONS.tools.getProductItemsTemplatesList,
			inputSchema: z.object({
				collectionId: z.string().uuid().optional().describe(DESCRIPTIONS.fields.collectionId),
			}),
			execute: async ({ collectionId }) => {
				try {
					let query = supabase
						.from('product_items_templates')
						.select('*')
						.eq('organisation_id', organisationId);

					if (collectionId) {
						query = query.eq('collection_id', collectionId);
					}

					const { data, error } = await query.order('position', { ascending: true });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						items: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getProductItemTemplate: tool({
			description: DESCRIPTIONS.tools.getProductItemTemplate,
			inputSchema: z.object({
				id: z.string().uuid('Item template ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('product_items_templates')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Product item template not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						item: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createProductItemTemplate: tool({
			description: DESCRIPTIONS.tools.createProductItemTemplate,
			inputSchema: z.object({
				collection_id: z
					.string()
					.uuid('Collection ID is required')
					.describe(DESCRIPTIONS.fields.collection_id),
				name: z.string().min(1, 'Item name is required').describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				unit_price: z
					.number()
					.min(0, 'Unit price must be non-negative')
					.describe(DESCRIPTIONS.fields.unit_price),
				unit_type: z.string().min(1, 'Unit type is required').describe(DESCRIPTIONS.fields.unit_type),
				iternal_name: z.string().nullable().optional().describe(DESCRIPTIONS.fields.iternal_name),
				internal_notes: z.string().nullable().optional().describe(DESCRIPTIONS.fields.internal_notes),
			}),
			execute: async (input) => {
				try {
					// Calculate next position
					const { data: existingItems } = await supabase
						.from('product_items_templates')
						.select('position')
						.eq('collection_id', input.collection_id)
						.order('position', { ascending: false })
						.limit(1);

					const nextPosition =
						existingItems && existingItems.length > 0 ? existingItems[0].position + 1000 : 1000;

					const { data, error } = await supabase
						.from('product_items_templates')
						.insert({
							collection_id: input.collection_id,
							name: input.name,
							description: input.description || null,
							unit_price: input.unit_price,
							unit_type: input.unit_type,
							iternal_name: input.iternal_name || null,
							internal_notes: input.internal_notes || null,
							organisation_id: organisationId,
							position: nextPosition,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						item: data as ProductItemTemplate,
						message: 'Product item template created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateProductItemTemplate: tool({
			description: DESCRIPTIONS.tools.updateProductItemTemplate,
			inputSchema: z.object({
				id: z.string().uuid('Item template ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				unit_price: z.number().min(0).optional().describe(DESCRIPTIONS.fields.unit_price),
				unit_type: z.string().min(1).optional().describe(DESCRIPTIONS.fields.unit_type),
				iternal_name: z.string().nullable().optional().describe(DESCRIPTIONS.fields.iternal_name),
				internal_notes: z.string().nullable().optional().describe(DESCRIPTIONS.fields.internal_notes),
				position: z.number().optional().describe(DESCRIPTIONS.fields.position),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<ProductItemTemplate> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							cleanUpdates[key as keyof ProductItemTemplate] = value as any;
						}
					});

					const { data, error } = await supabase
						.from('product_items_templates')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						item: data as ProductItemTemplate,
						message: 'Product item template updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteProductItemTemplate: tool({
			description: DESCRIPTIONS.tools.deleteProductItemTemplate,
			inputSchema: z.object({
				id: z.string().uuid('Item template ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('product_items_templates').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Product item template deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
