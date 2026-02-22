import { createAnthropic } from '@ai-sdk/anthropic';
import { customProvider } from 'ai';

/**
 * Creates an Anthropic provider with the given API key
 * @param apiKey - The Anthropic API key from organisation settings
 * @returns A custom provider configured with the API key
 */
export function createAIProvider(apiKey: string | null | undefined) {
	if (!apiKey) {
		throw new Error('Anthropic API key is required. Please set it in your organisation settings.');
	}

	const anthropic = createAnthropic({
		apiKey: apiKey,
	});

	return customProvider({
		languageModels: {
			'claude-opus-4-1': anthropic('claude-opus-4-1-20250805'),
			'claude-opus-4': anthropic('claude-opus-4-20250514'),
			'claude-sonnet-4-5': anthropic('claude-sonnet-4-5-20250929'),
			'claude-sonnet-4': anthropic('claude-sonnet-4-20250514'),
			'claude-haiku-4-5': anthropic('claude-haiku-4-5-20251001'),
		},
	});
}
