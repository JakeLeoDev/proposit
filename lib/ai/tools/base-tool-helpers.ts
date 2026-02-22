import type { createClient } from '@/lib/supabase/server';

export interface ToolContext {
	organisationId: string;
	userId: string;
	supabase: Awaited<ReturnType<typeof createClient>>;
	onFieldChange?: (field: string, value: unknown) => void;
}

/**
 * Handles errors in tool execution and returns a consistent error response
 */
export function handleToolError(error: unknown): { success: false; error: string } {
	console.error('handleToolError called with:', error);

	if (error instanceof Error) {
		return {
			success: false,
			error: error.message,
		};
	}

	// Try to stringify the error if it's an object
	if (typeof error === 'object' && error !== null) {
		try {
			const errorString = JSON.stringify(error);
			return {
				success: false,
				error: `Error: ${errorString}`,
			};
		} catch {
			// If stringification fails, use toString
			return {
				success: false,
				error: String(error),
			};
		}
	}

	return {
		success: false,
		error: `An unknown error occurred: ${String(error)}`,
	};
}

/**
 * Triggers a field change callback if available
 */
export function triggerFieldChange(
	onFieldChange: ToolContext['onFieldChange'],
	field: string,
	value: unknown
): void {
	if (onFieldChange) {
		onFieldChange(field, value);
	}
}
