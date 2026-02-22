import { tool } from 'ai';
import { z } from 'zod';
import type { ProductItem } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getProductItemsList: 'Get all product items for a collection',
		getProductItem: 'Get a single product item by Product Item ID',
		createProductItem: 'Create a new product item',
		updateProductItem: 'Update an existing product item',
		deleteProductItem: 'Delete a product item',
	},
	fields: {
		id: '',
		productCollectionId: '',
		product_collection_id: '',
		name: '',
		description: '',
		unit_price: '',
		unit_type: '',
		unit_amount: '',
		position: '',
	},
};

export function createProductItemsTools(context: ToolContext) {
	const { organisationId, supabase } = context;

	return {
		getProductItemsList: tool({
			description: DESCRIPTIONS.tools.getProductItemsList,
			inputSchema: z.object({
				productCollectionId: z
					.string()
					.uuid('Product collection ID is required')
					.describe(DESCRIPTIONS.fields.productCollectionId),
			}),
			execute: async ({ productCollectionId }) => {
				try {
					const { data: collection } = await supabase
						.from('product_collections')
						.select('id')
						.eq('id', productCollectionId)
						.eq('organisation_id', organisationId)
						.single();

					if (!collection) {
						return { success: false, error: 'Product collection not found or access denied' };
					}

					const { data, error } = await supabase
						.from('product_items')
						.select('*')
						.eq('product_collection_id', productCollectionId)
						.order('position', { ascending: true });

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

		getProductItem: tool({
			description: DESCRIPTIONS.tools.getProductItem,
			inputSchema: z.object({
				id: z.string().uuid('Item ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('product_items')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Product item not found' };
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

		createProductItem: tool({
			description: DESCRIPTIONS.tools.createProductItem,
			inputSchema: z.object({
				product_collection_id: z
					.string()
					.uuid('Product collection ID is required')
					.describe(DESCRIPTIONS.fields.product_collection_id),
				name: z.string().min(1, 'Item name is required').describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				unit_price: z
					.number()
					.min(0, 'Unit price must be non-negative')
					.describe(DESCRIPTIONS.fields.unit_price),
				unit_type: z.string().min(1, 'Unit type is required').describe(DESCRIPTIONS.fields.unit_type),
				unit_amount: z
					.number()
					.min(0, 'Unit amount must be non-negative')
					.describe(DESCRIPTIONS.fields.unit_amount),
			}),
			execute: async (input) => {
				try {
					const { data: collection } = await supabase
						.from('product_collections')
						.select('id')
						.eq('id', input.product_collection_id)
						.eq('organisation_id', organisationId)
						.single();

					if (!collection) {
						return { success: false, error: 'Product collection not found or access denied' };
					}

					// Calculate next position
					const { data: existingItems } = await supabase
						.from('product_items')
						.select('position')
						.eq('product_collection_id', input.product_collection_id)
						.order('position', { ascending: false })
						.limit(1);

					const nextPosition =
						existingItems && existingItems.length > 0 ? existingItems[0].position + 1000 : 1000;

					const { data, error } = await supabase
						.from('product_items')
						.insert({
							product_collection_id: input.product_collection_id,
							name: input.name,
							description: input.description || null,
							unit_price: input.unit_price,
							unit_type: input.unit_type,
							unit_amount: input.unit_amount,
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
						item: data as ProductItem,
						message: 'Product item created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateProductItem: tool({
			description: DESCRIPTIONS.tools.updateProductItem,
			inputSchema: z.object({
				id: z.string().uuid('Item ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
				unit_price: z.number().min(0).optional().describe(DESCRIPTIONS.fields.unit_price),
				unit_type: z.string().min(1).optional().describe(DESCRIPTIONS.fields.unit_type),
				unit_amount: z.number().min(0).optional().describe(DESCRIPTIONS.fields.unit_amount),
				position: z.number().optional().describe(DESCRIPTIONS.fields.position),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<ProductItem> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							cleanUpdates[key as keyof ProductItem] = value as any;
						}
					});

					const { data, error } = await supabase
						.from('product_items')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						item: data as ProductItem,
						message: 'Product item updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteProductItem: tool({
			description: DESCRIPTIONS.tools.deleteProductItem,
			inputSchema: z.object({
				id: z.string().uuid('Item ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('product_items').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Product item deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
