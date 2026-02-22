import { tool } from 'ai';
import { z } from 'zod';
import type { Person } from '@/lib/types';
import type { ToolContext } from './base-tool-helpers';
import { handleToolError, triggerFieldChange } from './base-tool-helpers';

const DESCRIPTIONS = {
	tools: {
		getPersonsList:
			'Get all persons. Use this tool to search for existing contact persons by name, email, or company association. Always use this tool FIRST when a user mentions a person that should already exist, before asking for IDs or creating a new person. Optionally filter by companyId if you know which company the person belongs to.',
		getPerson: 'Get a single person by Person ID',
		createPerson:
			'Create a new contact person at a client company, requiring first name, last name, company association, and optionally position and contact details.',
		updatePerson: 'Update an existing person',
		deletePerson: 'Delete a person',
	},
	fields: {
		id: '',
		companyId: '',
		first_name: '',
		last_name: '',
		company_id: '',
		title: '',
		position: '',
		email: '',
		number: '',
		mobile_number: '',
	},
};

export function createPersonsTools(context: ToolContext) {
	const { organisationId, supabase, onFieldChange } = context;

	return {
		getPersonsList: tool({
			description: DESCRIPTIONS.tools.getPersonsList,
			inputSchema: z.object({
				companyId: z.string().uuid().optional().describe(DESCRIPTIONS.fields.companyId),
			}),
			execute: async ({ companyId }) => {
				try {
					let query = supabase.from('persons').select('*').eq('organisation_id', organisationId);

					if (companyId) {
						query = query.eq('company_id', companyId);
					}

					const { data, error } = await query.order('created_at', { ascending: false });

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						persons: data || [],
						count: data?.length || 0,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		getPerson: tool({
			description: DESCRIPTIONS.tools.getPerson,
			inputSchema: z.object({
				id: z.string().uuid('Person ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { data, error } = await supabase
						.from('persons')
						.select('*')
						.eq('id', id)
						.eq('organisation_id', organisationId)
						.single();

					if (error) {
						if ((error as any).code === 'PGRST116') {
							return { success: false, error: 'Person not found' };
						}
						return handleToolError(error);
					}

					return {
						success: true,
						person: data,
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		createPerson: tool({
			description: DESCRIPTIONS.tools.createPerson,
			inputSchema: z.object({
				first_name: z
					.string()
					.min(1, 'First name is required')
					.describe(DESCRIPTIONS.fields.first_name),
				last_name: z.string().min(1, 'Last name is required').describe(DESCRIPTIONS.fields.last_name),
				company_id: z.string().uuid('Company ID is required').describe(DESCRIPTIONS.fields.company_id),
				title: z.string().optional().nullable().describe(DESCRIPTIONS.fields.title),
				position: z.string().optional().describe(DESCRIPTIONS.fields.position),
				email: z.string().email().optional().describe(DESCRIPTIONS.fields.email),
				number: z.string().optional().describe(DESCRIPTIONS.fields.number),
				mobile_number: z.string().optional().describe(DESCRIPTIONS.fields.mobile_number),
			}),
			execute: async (input) => {
				try {
					const { data, error } = await supabase
						.from('persons')
						.insert({
							first_name: input.first_name,
							last_name: input.last_name,
							company_id: input.company_id,
							organisation_id: organisationId,
							title: input.title || null,
							position: input.position || null,
							email: input.email || null,
							number: input.number || null,
							mobile_number: input.mobile_number || null,
						})
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					triggerFieldChange(onFieldChange, 'recipient', data.id);

					return {
						success: true,
						person: data as Person,
						message: 'Person created successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		updatePerson: tool({
			description: DESCRIPTIONS.tools.updatePerson,
			inputSchema: z.object({
				id: z.string().uuid('Person ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
				first_name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.first_name),
				last_name: z.string().min(1).optional().describe(DESCRIPTIONS.fields.last_name),
				company_id: z.string().uuid().optional().describe(DESCRIPTIONS.fields.company_id),
				title: z.string().optional().nullable().describe(DESCRIPTIONS.fields.title),
				position: z.string().optional().describe(DESCRIPTIONS.fields.position),
				email: z.string().email().optional().describe(DESCRIPTIONS.fields.email),
				number: z.string().optional().describe(DESCRIPTIONS.fields.number),
				mobile_number: z.string().optional().describe(DESCRIPTIONS.fields.mobile_number),
			}),
			execute: async ({ id, ...updates }) => {
				try {
					const cleanUpdates: Partial<Person> = {};
					Object.entries(updates).forEach(([key, value]) => {
						if (value !== undefined) {
							cleanUpdates[key as keyof Person] = value as any;
						}
					});

					const { data, error } = await supabase
						.from('persons')
						.update(cleanUpdates)
						.eq('id', id)
						.select()
						.single();

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						person: data as Person,
						message: 'Person updated successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),

		deletePerson: tool({
			description: DESCRIPTIONS.tools.deletePerson,
			inputSchema: z.object({
				id: z.string().uuid('Person ID must be a valid UUID').describe(DESCRIPTIONS.fields.id),
			}),
			execute: async ({ id }) => {
				try {
					const { error } = await supabase.from('persons').delete().eq('id', id);

					if (error) {
						return handleToolError(error);
					}

					return {
						success: true,
						message: 'Person deleted successfully',
					};
				} catch (error) {
					return handleToolError(error);
				}
			},
		}),
	};
}
