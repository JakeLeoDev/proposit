import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { systemPrompt } from '@/lib/ai/prompts';
import { getLexicalNodeTypesPrompt } from '@/lib/lexical-config';

export function registerResourcesOnMcpServer(server: McpServer) {
	server.resource(
		'system-context',
		'proposit://context/system',
		{
			mimeType: 'text/plain',
			description: 'Base system prompt with role, entities, and tool guidelines',
		},
		() => ({
			contents: [
				{
					uri: 'proposit://context/system',
					mimeType: 'text/plain',
					text: systemPrompt({}),
				},
			],
		})
	);

	server.resource(
		'lexical-format',
		'proposit://context/lexical-format',
		{ mimeType: 'text/plain', description: 'Lexical editor node types and format specification' },
		() => ({
			contents: [
				{
					uri: 'proposit://context/lexical-format',
					mimeType: 'text/plain',
					text: getLexicalNodeTypesPrompt(),
				},
			],
		})
	);
}
