import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { systemPrompt } from '@/lib/ai/prompts';

export function registerPromptsOnMcpServer(
	server: McpServer,
	{
		organisationId,
		proposalId,
		supabase,
	}: {
		organisationId: string;
		proposalId?: string;
		supabase: SupabaseClient;
	}
) {
	server.prompt(
		'proposal-assistant',
		'Full system prompt for the proposal assistant (same as the built-in chat)',
		{ proposalId: z.string().optional().describe('Proposal UUID to set as current context') },
		async (args) => {
			const { data: organisation } = await supabase
				.from('organisations')
				.select('ai_system_prompt')
				.eq('id', organisationId)
				.single();

			const effectiveProposalId = args.proposalId || proposalId;

			return {
				messages: [
					{
						role: 'user' as const,
						content: {
							type: 'text' as const,
							text: systemPrompt({
								requestHints: effectiveProposalId ? { proposalId: effectiveProposalId } : undefined,
								organisationSystemPrompt: organisation?.ai_system_prompt,
							}),
						},
					},
				],
			};
		}
	);
}
