import { tool } from 'ai';
import { z } from 'zod';
import type { Category } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getCategoriesList: 'Get all categories',
		getCategory: 'Get a single category by Category ID',
		createCategory: 'Create a new category',
		updateCategory: 'Update an existing category',
		deleteCategory: 'Delete a category',
	},
	fields: {
		id: '',
		name: '',
		description: '',
	},
};

export function createCategoriesTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getCategoriesList: tool({
			description: DESCRIPTIONS.tools.getCategoriesList,
			inputSchema: z.object({}),
			execute: async () => {
				try {
					const { data, error } = await supabase
						.from('categories')
						.select('*')
						.eq('organisation_id', organisationId)
						.order('created_at', { ascending: false });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						categories: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getCategory: tool({
			description: DESCRIPTIONS.tools.getCategory,
			inputSchema: z.object({
				id: z.string().uuid('Category ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('categories')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Category not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						category: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createCategory: tool({
			description: DESCRIPTIONS.tools.createCategory,
			inputSchema: z.object({
				name: z.string().min(1, 'Category name is required').describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
			}),
			execute: async ({ name, description }) => {
				try {
					const { data, error } = await supabase
						.from('categories')
						.insert({
							name,
							description: description || null,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'category', data.id);

					return {
						success: true,
						category: data as Category,
						message: 'Category created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateCategory: tool({
			description: DESCRIPTIONS.tools.updateCategory,
			inputSchema: z.object({
				id: z.string().uuid('Category ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().nullable().optional().describe(DESCRIPTIONS.fields.description),
			}),
			execute: async ({ id, name, description }) => {
				try {
					const updates: Partial<Category> = {};
					if (name !== undefined) updates.name = name;
					if (description !== undefined) updates.description = description;

					const { data, error } = await supabase
						.from('categories')
						.update(updates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						category: data as Category,
						message: 'Category updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteCategory: tool({
			description: DESCRIPTIONS.tools.deleteCategory,
			inputSchema: z.object({
				id: z.string().uuid('Category ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('categories').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Category deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
