type Operation = 'fetch' | 'create' | 'update' | 'delete';

const FK_TABLE_DISPLAY_NAMES: Record<string, string> = {
	links: 'links',
	proposal_versions: 'versions',
	proposal_images: 'images',
	attachments: 'attachments',
	product_collections_instances: 'product collections',
	product_items_instances: 'product items',
	persons: 'contact persons',
	proposals: 'proposals',
};

function extractForeignTableFromConstraint(constraintName: string): string | null {
	// Pattern: <table>_<column>_fkey — extract the table prefix
	const match = constraintName.match(/^([a-z_]+?)_[a-z_]+_fkey$/);
	if (match) {
		const tableName = match[1];
		return FK_TABLE_DISPLAY_NAMES[tableName] ?? tableName.replace(/_/g, ' ');
	}
	return null;
}

/**
 * Maps a raw Supabase / PostgreSQL error to a user-friendly Error object.
 * Never exposes raw database error messages to the caller.
 */
export function mapServiceError(error: unknown, operation: Operation = 'delete'): Error {
	const pgError = error as Record<string, unknown>;
	const code = typeof pgError?.code === 'string' ? pgError.code : null;
	const message = typeof pgError?.message === 'string' ? pgError.message : '';

	if (code === '23503') {
		// Foreign key violation
		const constraintMatch = message.match(/"([a-z_]+_fkey)"/);
		if (constraintMatch) {
			const displayName = extractForeignTableFromConstraint(constraintMatch[1]);
			if (displayName) {
				return new Error(
					`This item cannot be deleted because it still has associated ${displayName}. Please remove them first.`
				);
			}
		}
		return new Error(
			'This item cannot be deleted because it is still referenced by other records. Please remove the related items first.'
		);
	}

	if (code === '23505') {
		return new Error('An item with these details already exists. Please use different values.');
	}

	if (code === '23502') {
		return new Error('A required field is missing. Please fill in all required fields.');
	}

	const operationMessages: Record<Operation, string> = {
		fetch: 'Failed to load data. Please try again.',
		create: 'Failed to save the item. Please try again.',
		update: 'Failed to save changes. Please try again.',
		delete: 'Failed to delete the item. Please try again.',
	};

	return new Error(operationMessages[operation]);
}
