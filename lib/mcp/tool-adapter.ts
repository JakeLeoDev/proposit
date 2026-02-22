import type { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface AiTool {
	description: string;
	inputSchema: z.ZodType;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	execute: (args: any) => Promise<any>;
}

export function registerToolsOnMcpServer(
	server: McpServer,
	tools: Record<string, AiTool>,
	proposalId?: string
) {
	for (const [name, aiTool] of Object.entries(tools)) {
		server.registerTool(
			name,
			{
				description: aiTool.description,
				inputSchema: aiTool.inputSchema,
			},
			async (args) => {
				// If proposalId provided and this is getProposal, inject default id
				const argsObj = args as Record<string, unknown>;
				let finalArgs: Record<string, unknown> = argsObj;
				if (proposalId && name === 'getProposal' && !argsObj.id) {
					finalArgs = { ...argsObj, id: proposalId };
				}

				const result = await aiTool.execute(finalArgs);

				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify(result),
						},
					],
				};
			}
		);
	}
}
