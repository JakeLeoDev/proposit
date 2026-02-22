import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export class ProposalNumberService {
	private supabase?: SupabaseClient;

	/**
	 * Sets the Supabase client to use (for server-side usage)
	 */
	setSupabaseClient(client: SupabaseClient) {
		this.supabase = client;
	}

	/**
	 * Gets the Supabase client (creates browser client if not set)
	 */
	private async getSupabaseClient(): Promise<SupabaseClient> {
		if (this.supabase) {
			return this.supabase;
		}
		// Fallback to browser client (browser context)
		// Note: Server client should be set explicitly via setSupabaseClient()
		return createClient();
	}

	/**
	 * Generates a proposal number based on the organization's template
	 * @param organisationId - The organization ID
	 * @param template - Optional template override (uses org template if not provided)
	 * @returns Generated proposal number
	 */
	async generateProposalNumber(organisationId: string, template?: string): Promise<string> {
		const supabase = await this.getSupabaseClient();

		// Get organization settings
		const { data: organisation, error: orgError } = await supabase
			.from('organisations')
			.select('proposal_number_template, proposal_number_start')
			.eq('id', organisationId)
			.maybeSingle();

		if (orgError || !organisation) {
			throw new Error(
				`Failed to fetch organization: ${orgError?.message || 'Organization not found'}`
			);
		}

		// Use provided template or organization template
		const templateToUse = template || organisation.proposal_number_template;

		// Get total count of proposals for this organization
		const { count, error: countError } = await supabase
			.from('proposals')
			.select('*', { count: 'exact', head: true })
			.eq('organisation_id', organisationId);

		if (countError) {
			throw new Error(`Failed to count proposals: ${countError.message}`);
		}

		// Calculate the next number (total count + start number)
		const startNumber = organisation.proposal_number_start || 0;
		const nextNumber = (count || 0) + startNumber + 1;

		// If no template is set, just return the calculated number
		if (!templateToUse) {
			return nextNumber.toString();
		}

		// Generate the proposal number by replacing template variables
		return this.replaceTemplateVariables(templateToUse, nextNumber);
	}

	/**
	 * Replaces template variables with actual values
	 * @param template - Template string with variables like NUM, DATE, etc.
	 * @param number - Sequential number to use for NUM
	 * @returns Processed template string
	 */
	private replaceTemplateVariables(template: string, number: number): string {
		const now = new Date();

		// Format number with leading zeros (4 digits)
		const formattedNumber = number.toString().padStart(4, '0');

		// Format date components
		const year = now.getFullYear().toString();
		const month = (now.getMonth() + 1).toString().padStart(2, '0');
		const day = now.getDate().toString().padStart(2, '0');
		const date = `${year}-${month}-${day}`;

		// Replace all template variables (without curly braces)
		return template
			.replace(/NUM/g, formattedNumber)
			.replace(/DATE/g, date)
			.replace(/YEAR/g, year)
			.replace(/MONTH/g, month)
			.replace(/DAY/g, day);
	}

	/**
	 * Validates a template string
	 * @param template - Template to validate
	 * @returns True if template is valid
	 */
	validateTemplate(template: string): boolean {
		// Check if template contains at least NUM
		if (!template.includes('NUM')) {
			return false;
		}

		// Check for valid variables only (without curly braces)
		const validVariables = ['NUM', 'DATE', 'YEAR', 'MONTH', 'DAY'];
		// Match uppercase words that are not part of other words
		const templateVariables = template.match(/\b[A-Z]+\b/g) || [];

		return templateVariables.every((variable) => validVariables.includes(variable));
	}

	/**
	 * Gets a preview of what a proposal number would look like
	 * @param template - Template to preview
	 * @param sampleNumber - Sample number to use (default: 1)
	 * @returns Preview string
	 */
	getTemplatePreview(template: string, sampleNumber: number = 1): string {
		return this.replaceTemplateVariables(template, sampleNumber);
	}
}

export const proposalNumberService = new ProposalNumberService();
