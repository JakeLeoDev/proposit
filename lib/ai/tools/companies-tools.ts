import { tool } from 'ai';
import { z } from 'zod';
import type { Company } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getCompaniesList:
			'Get all companies. Use this tool to search for existing companies by name, email, or other identifiers. Always use this tool FIRST when a user mentions a company that should already exist, before asking for IDs or creating a new company.',
		getCompany: 'Get a single company by Company ID',
		createCompany:
			'Create a new client company that will receive business proposals, with unique name and required legal form, industry, and address.',
		updateCompany: 'Update an existing company',
		deleteCompany: 'Delete a company',
	},
	fields: {
		id: '',
		name: '',
		legal_name: '',
		description: '',
		legal_form: '',
		industry: '',
		street_and_number: '',
		city: '',
		postal_code: '',
		country: '',
		email: '',
		number: '',
		website: '',
		fax: '',
		tax_number: '',
		vat_id: '',
		commercial_register: '',
		ceo: '',
	},
};

export function createCompaniesTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getCompaniesList: tool({
			description: DESCRIPTIONS.tools.getCompaniesList,
			inputSchema: z.object({}),
			execute: async () => {
				try {
					const { data, error } = await supabase
						.from('companies')
						.select('*')
						.eq('organisation_id', organisationId)
						.order('created_at', { ascending: false });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						companies: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getCompany: tool({
			description: DESCRIPTIONS.tools.getCompany,
			inputSchema: z.object({
				id: z.string().uuid('Company ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('companies')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Company not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						company: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createCompany: tool({
			description: DESCRIPTIONS.tools.createCompany,
			inputSchema: z.object({
				name: z.string().min(1, 'Company name is required').describe(DESCRIPTIONS.fields.name),
				legal_name: z
					.string()
					.min(1, 'Legal name is required')
					.describe(DESCRIPTIONS.fields.legal_name),
				description: z.string().optional().describe(DESCRIPTIONS.fields.description),
				legal_form: z.string().optional().describe(DESCRIPTIONS.fields.legal_form),
				industry: z.string().optional().describe(DESCRIPTIONS.fields.industry),
				street_and_number: z.string().optional().describe(DESCRIPTIONS.fields.street_and_number),
				city: z.string().optional().describe(DESCRIPTIONS.fields.city),
				postal_code: z.string().optional().describe(DESCRIPTIONS.fields.postal_code),
				country: z.string().optional().describe(DESCRIPTIONS.fields.country),
				email: z.string().email().optional().nullable().describe(DESCRIPTIONS.fields.email),
				number: z.string().optional().nullable().describe(DESCRIPTIONS.fields.number),
				website: z.string().url().optional().nullable().describe(DESCRIPTIONS.fields.website),
				fax: z.string().optional().nullable().describe(DESCRIPTIONS.fields.fax),
				tax_number: z.string().optional().nullable().describe(DESCRIPTIONS.fields.tax_number),
				vat_id: z.string().optional().nullable().describe(DESCRIPTIONS.fields.vat_id),
				commercial_register: z
					.string()
					.optional()
					.nullable()
					.describe(DESCRIPTIONS.fields.commercial_register),
				ceo: z.string().optional().nullable().describe(DESCRIPTIONS.fields.ceo),
			}),
			execute: async (input) => {
				try {
					const { data, error } = await supabase
						.from('companies')
						.insert({
							name: input.name,
							legal_name: input.legal_name,
							description: input.description || '',
							legal_form: input.legal_form || 'N/A',
							industry: input.industry || 'Other',
							street_and_number: input.street_and_number || '',
							city: input.city || '',
							postal_code: input.postal_code || '',
							country: input.country || '',
							email: input.email || null,
							number: input.number || null,
							website: input.website || null,
							fax: input.fax || null,
							tax_number: input.tax_number || null,
							vat_id: input.vat_id || null,
							commercial_register: input.commercial_register || null,
							ceo: input.ceo || null,
							organisation_id: organisationId,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'company', data.id);

					return {
						success: true,
						company: data as Company,
						message: 'Company created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updateCompany: tool({
			description: DESCRIPTIONS.tools.updateCompany,
			inputSchema: z.object({
				id: z.string().uuid('Company ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.name),
				legal_name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.legal_name),
				description: z.string().optional().describe(DESCRIPTIONS.fields.description),
				legal_form: z.string().optional().describe(DESCRIPTIONS.fields.legal_form),
				industry: z.string().optional().describe(DESCRIPTIONS.fields.industry),
				street_and_number: z.string().optional().describe(DESCRIPTIONS.fields.street_and_number),
				city: z.string().optional().describe(DESCRIPTIONS.fields.city),
				postal_code: z.string().optional().describe(DESCRIPTIONS.fields.postal_code),
				country: z.string().optional().describe(DESCRIPTIONS.fields.country),
				email: z.string().email().optional().nullable().describe(DESCRIPTIONS.fields.email),
				number: z.string().optional().nullable().describe(DESCRIPTIONS.fields.number),
				website: z.string().url().optional().nullable().describe(DESCRIPTIONS.fields.website),
				fax: z.string().optional().nullable().describe(DESCRIPTIONS.fields.fax),
				tax_number: z.string().optional().nullable().describe(DESCRIPTIONS.fields.tax_number),
				vat_id: z.string().optional().nullable().describe(DESCRIPTIONS.fields.vat_id),
				commercial_register: z
					.string()
					.optional()
					.nullable()
					.describe(DESCRIPTIONS.fields.commercial_register),
				ceo: z.string().optional().nullable().describe(DESCRIPTIONS.fields.ceo),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<Company> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							cleanUpdates[key as keyof Company] = value as any;
						}
					});

					const { data, error } = await supabase
						.from('companies')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						company: data as Company,
						message: 'Company updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deleteCompany: tool({
			description: DESCRIPTIONS.tools.deleteCompany,
			inputSchema: z.object({
				id: z.string().uuid('Company ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('companies').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Company deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
