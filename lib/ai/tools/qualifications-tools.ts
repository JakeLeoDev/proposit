import { tool } from 'ai';
import { z } from 'zod';
import type { Qualification } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';
import { getDefaultContent, validateLexicalContent } from '@/lib/lexical-config';

const QUALIFICATION_LIST_SELECT = 'id, name, description, category, organisation_id, created_at';

const DESCRIPTIONS = {
	tools: {
		getQualificationsList:
			'Get all qualifications (without content field — use getQualification to retrieve the full content of a specific qualification)',
		getQualification: 'Get a single qualification by Qualification ID',
		createQualification: 'Create a new qualification.',
		updateQualification: 'Update an existing qualification.',
		deleteQualification: 'Delete a qualification',
	},
	fields: {
		id: '',
		categoryId: '',
		name: '',
		description: '',
		category: '',
		content: '',
	},
};

export function createQualificationsTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getQualificationsList: tool({
			description: DESCRIPTIONS.tools.getQualificationsList,
			inputSchema: z.object({
				categoryId: z.string().uuid().optional().describe(DESCRIPTIONS.fields.categoryId),
			}),
			execute: async ({ categoryId }) => {
				try {
					let query = supabase
						.from('qualifications')
						.select(QUALIFICATION_LIST_SELECT)
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
						qualifications: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getQualification: tool({
			description: DESCRIPTIONS.tools.getQualification,
			inputSchema: z.object({
				id: z.string().uuid('Qualification ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('qualifications')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Qualification not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						qualification: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createQualification: tool({
			description: DESCRIPTIONS.tools.createQualification,
			inputSchema: z.object({
				name: z.string().min(1, 'Qualification name is required').describe(DESCRIPTIONS.fields.name),
				description: z
					.string()
					.min(1, 'Description is required')
					.describe(DESCRIPTIONS.fields.description),
				category: z.string().uuid('Category ID is required').describe(DESCRIPTIONS.fields.category),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
			}),
			execute: async ({ name, description, category, content }) => {
				try {
					// Validate and ensure content is in Lexical format
					let qualificationContent = getDefaultContent();
					if (content !== undefined && content !== null) {
						// Validate content first
						const validationResult = validateLexicalContent(content);
						if (!validationResult.valid) {
							return {
								success: false,
								error: 'The returned value does not have the correct lexical value.',
							};
						}
						// Use validated content directly
						qualificationContent = content;
					}

					const { data, error } = await supabase
						.from('qualifications')
						.insert({
							name,
							description,
							category,
							content: qualificationContent,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'qualification', data.id);

					return {
						success: true,
						qualification: data as Qualification,
						message: 'Qualification created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateQualification: tool({
			description: DESCRIPTIONS.tools.updateQualification,
			inputSchema: z.object({
				id: z.string().uuid('Qualification ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().min(1).optional().describe(DESCRIPTIONS.fields.description),
				category: z.string().uuid().optional().describe(DESCRIPTIONS.fields.category),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<Qualification> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							// Validate content if it's the content field
							if (key === 'content') {
								// Validate content first
								const validationResult = validateLexicalContent(value);
								if (!validationResult.valid) {
									throw new Error('The returned value does not have the correct lexical value.');
								}
								// Use validated content directly
								cleanUpdates[key as keyof Qualification] = value as any;
							} else {
								cleanUpdates[key as keyof Qualification] = value as any;
							}
						}
					});

					const { data, error } = await supabase
						.from('qualifications')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						qualification: data as Qualification,
						message: 'Qualification updated successfully',
					};
				} catch (error) {
					// Check if it's a validation error
					if (
						error instanceof Error &&
						error.message === 'The returned value does not have the correct lexical value.'
					) {
						return {
							success: false,
							error: 'The returned value does not have the correct lexical value.',
						};
					}
					return handleToolError(error);
				}
			},
		}),

		deleteQualification: tool({
			description: DESCRIPTIONS.tools.deleteQualification,
			inputSchema: z.object({
				id: z.string().uuid('Qualification ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('qualifications').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Qualification deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
