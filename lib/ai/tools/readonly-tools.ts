import type { ToolContext } from './base-tool-helpers';

export function createReadonlyTools(_context: ToolContext) {
	// All readonly tools (users, organisations, invitations) have been removed
	// as organisation ID and user ID are automatically provided via context
	return {};
}
