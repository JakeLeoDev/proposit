/**
 * Available tool groups for AI assistant
 * Each group corresponds to a set of related tools
 */
export interface ToolGroup {
	id: string;
	label: string;
	description?: string;
}

export const toolGroups: ToolGroup[] = [
	{
		id: 'categories',
		label: 'Categories',
		description: 'Manage proposal categories',
	},
	{
		id: 'companies',
		label: 'Companies',
		description: 'Create and manage companies',
	},
	{
		id: 'persons',
		label: 'Persons',
		description: 'Create and manage persons',
	},
	{
		id: 'proposals',
		label: 'Proposals',
		description: 'Create and manage proposals',
	},
	{
		id: 'attachments',
		label: 'Attachments',
		description: 'Manage file attachments',
	},
	{
		id: 'qualifications',
		label: 'Qualifications',
		description: 'Manage qualifications',
	},
	{
		id: 'certificates',
		label: 'Certificates',
		description: 'Manage certificates',
	},
	{
		id: 'productCollectionsTemplates',
		label: 'Product Collection Templates',
		description: 'Manage product collection templates',
	},
	{
		id: 'productItemsTemplates',
		label: 'Product Item Templates',
		description: 'Manage product item templates',
	},
	{
		id: 'productCollections',
		label: 'Product Collections',
		description: 'Manage product collections',
	},
	{
		id: 'productItems',
		label: 'Product Items',
		description: 'Manage product items',
	},
];

/**
 * Tool groups that are always enabled (not selectable)
 */
export const ALWAYS_ENABLED_TOOLS: string[] = [];

/**
 * Default enabled tools (all tools enabled by default)
 */
export const DEFAULT_ENABLED_TOOLS = toolGroups.map((group) => group.id);
