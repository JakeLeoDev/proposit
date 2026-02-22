export const DEFAULT_CHAT_MODEL: string = 'claude-haiku-4-5'; // Changed to Haiku for cost efficiency

export type ChatModel = {
	id: string;
	name: string;
	description: string;
};

export const chatModels: ChatModel[] = [
	{
		id: 'claude-opus-4-1',
		name: 'Claude Opus 4.1',
		description: 'Most capable model for complex tasks',
	},
	{
		id: 'claude-opus-4',
		name: 'Claude Opus 4',
		description: 'High-performance model for advanced reasoning',
	},
	{
		id: 'claude-sonnet-4-5',
		name: 'Claude Sonnet 4.5',
		description: 'Balanced performance and speed (recommended)',
	},
	{
		id: 'claude-sonnet-4',
		name: 'Claude Sonnet 4',
		description: 'Fast and efficient for most tasks',
	},
	{
		id: 'claude-haiku-4-5',
		name: 'Claude Haiku 4.5',
		description: 'Fastest model for quick responses',
	},
];

/**
 * Returns the context window size (in tokens) for a given model ID.
 * All Claude 4 models have a 200,000 token context window.
 */
export function getModelContextWindow(modelId: string): number {
	const contextWindows: Record<string, number> = {
		'claude-opus-4-1': 200_000,
		'claude-opus-4': 200_000,
		'claude-sonnet-4-5': 200_000,
		'claude-sonnet-4': 200_000,
		'claude-haiku-4-5': 200_000,
	};

	return contextWindows[modelId] ?? 200_000; // Default to 200k if unknown
}
