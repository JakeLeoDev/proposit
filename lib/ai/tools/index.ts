import type { ToolContext } from './base-tool-helpers';
import { createCategoriesTools } from './categories-tools';
import { createCompaniesTools } from './companies-tools';
import { createPersonsTools } from './persons-tools';
import { createProposalsTools } from './proposals-tools';
import { createAttachmentsTools } from './attachments-tools';
import { createQualificationsTools } from './qualifications-tools';
import { createCertificatesTools } from './certificates-tools';
import { createProductCollectionsTemplatesTools } from './product-collections-templates-tools';
import { createProductItemsTemplatesTools } from './product-items-templates-tools';
import { createProductCollectionsTools } from './product-collections-tools';
import { createProductItemsTools } from './product-items-tools';
import { DEFAULT_ENABLED_TOOLS, ALWAYS_ENABLED_TOOLS } from '../tool-groups';

export type { ToolContext } from './base-tool-helpers';

export interface CreateToolsOptions {
	organisationId: string;
	userId: string;
	supabase: ToolContext['supabase'];
	onFieldChange?: (field: string, value: unknown) => void;
	enabledTools?: string[];
}

/**
 * Creates AI tools based on enabled tool groups
 * @param options - Configuration options including enabled tool groups
 * @returns Object containing all enabled tools
 */
export function createAllTools(options: CreateToolsOptions) {
	const context: ToolContext = {
		organisationId: options.organisationId,
		userId: options.userId,
		supabase: options.supabase,
		onFieldChange: options.onFieldChange,
	};

	// Determine which tools to load
	const enabledTools = options.enabledTools ?? DEFAULT_ENABLED_TOOLS;
	const toolsToLoad = new Set([...enabledTools, ...ALWAYS_ENABLED_TOOLS]);

	// Tool group mapping
	const toolGroupMap: Record<string, () => Record<string, any>> = {
		categories: () => createCategoriesTools(context),
		companies: () => createCompaniesTools(context),
		persons: () => createPersonsTools(context),
		proposals: () => createProposalsTools(context),
		attachments: () => createAttachmentsTools(context),
		qualifications: () => createQualificationsTools(context),
		certificates: () => createCertificatesTools(context),
		productCollectionsTemplates: () => createProductCollectionsTemplatesTools(context),
		productItemsTemplates: () => createProductItemsTemplatesTools(context),
		productCollections: () => createProductCollectionsTools(context),
		productItems: () => createProductItemsTools(context),
	};

	// First, load all tool groups to extract List tools
	const allToolGroups: Record<string, Record<string, any>> = {};
	for (const [groupId, createToolGroup] of Object.entries(toolGroupMap)) {
		allToolGroups[groupId] = createToolGroup();
	}

	// Extract all List tools (tools whose name ends with "List")
	const listTools: Record<string, any> = {};
	for (const groupTools of Object.values(allToolGroups)) {
		for (const [toolName, tool] of Object.entries(groupTools)) {
			if (toolName.endsWith('List')) {
				listTools[toolName] = tool;
			}
		}
	}

	// Start with all List tools (always enabled)
	const loadedTools: Record<string, any> = { ...listTools };

	// Then add all tools from enabled tool groups (excluding List tools to avoid duplicates)
	for (const [groupId, groupTools] of Object.entries(allToolGroups)) {
		if (toolsToLoad.has(groupId)) {
			for (const [toolName, tool] of Object.entries(groupTools)) {
				// Skip List tools as they're already added
				if (!toolName.endsWith('List')) {
					loadedTools[toolName] = tool;
				}
			}
		}
	}

	return loadedTools;
}
