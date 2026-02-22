import { tool } from 'ai';
import { z } from 'zod';
import type { Certificate } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';
import { getDefaultContent, validateLexicalContent } from '@/lib/lexical-config';

const CERTIFICATE_LIST_SELECT = 'id, name, description, category, organisation_id, created_at';

const DESCRIPTIONS = {
	tools: {
		getCertificatesList:
			'Get all certificates (without content field — use getCertificate to retrieve the full content of a specific certificate)',
		getCertificate: 'Get a single certificate by Certificate ID',
		createCertificate: 'Create a new certificate.',
		updateCertificate: 'Update an existing certificate.',
		deleteCertificate: 'Delete a certificate',
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

export function createCertificatesTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getCertificatesList: tool({
			description: DESCRIPTIONS.tools.getCertificatesList,
			inputSchema: z.object({
				categoryId: z.string().uuid().optional().describe(DESCRIPTIONS.fields.categoryId),
			}),
			execute: async ({ categoryId }) => {
				try {
					let query = supabase
						.from('certificates')
						.select(CERTIFICATE_LIST_SELECT)
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
						certificates: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getCertificate: tool({
			description: DESCRIPTIONS.tools.getCertificate,
			inputSchema: z.object({
				id: z.string().uuid('Certificate ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('certificates')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Certificate not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						certificate: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createCertificate: tool({
			description: DESCRIPTIONS.tools.createCertificate,
			inputSchema: z.object({
				name: z.string().min(1, 'Certificate name is required').describe(DESCRIPTIONS.fields.name),
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
					let certificateContent = getDefaultContent();
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
						certificateContent = content;
					}

					const { data, error } = await supabase
						.from('certificates')
						.insert({
							name,
							description,
							category,
							content: certificateContent,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'certificate', data.id);

					return {
						success: true,
						certificate: data as Certificate,
						message: 'Certificate created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateCertificate: tool({
			description: DESCRIPTIONS.tools.updateCertificate,
			inputSchema: z.object({
				id: z.string().uuid('Certificate ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				description: z.string().min(1).optional().describe(DESCRIPTIONS.fields.description),
				category: z.string().uuid().optional().describe(DESCRIPTIONS.fields.category),
				content: z.any().optional().describe(DESCRIPTIONS.fields.content),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<Certificate> = {};
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
								cleanUpdates[key as keyof Certificate] = value as any;
							} else {
								cleanUpdates[key as keyof Certificate] = value as any;
							}
						}
					});

					const { data, error } = await supabase
						.from('certificates')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						certificate: data as Certificate,
						message: 'Certificate updated successfully',
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

		deleteCertificate: tool({
			description: DESCRIPTIONS.tools.deleteCertificate,
			inputSchema: z.object({
				id: z.string().uuid('Certificate ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('certificates').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Certificate deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
