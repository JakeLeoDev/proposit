import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateToken } from '@/lib/mcp/auth';
import { registerToolsOnMcpServer } from '@/lib/mcp/tool-adapter';
import { registerResourcesOnMcpServer } from '@/lib/mcp/resources';
import { registerPromptsOnMcpServer } from '@/lib/mcp/prompts';
import { createAllTools } from '@/lib/ai/tools';
import { createServiceClient } from '@/lib/supabase/server';

async function handleMcpRequest(request: Request) {
	const auth = await authenticateToken(request);
	if (!auth) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const url = new URL(request.url);
	const proposalId = url.searchParams.get('proposal') || undefined;

	const supabase = createServiceClient();

	const tools = createAllTools({
		organisationId: auth.organisationId,
		userId: auth.userId,
		supabase,
	});

	const server = new McpServer({
		name: 'proposit',
		version: '1.0.0',
	});

	registerToolsOnMcpServer(server, tools, proposalId);
	registerResourcesOnMcpServer(server);
	registerPromptsOnMcpServer(server, { organisationId: auth.organisationId, proposalId, supabase });

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined, // stateless
	});

	await server.connect(transport);

	return transport.handleRequest(request);
}

export async function POST(request: Request) {
	return handleMcpRequest(request);
}

export async function GET(request: Request) {
	return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
	return handleMcpRequest(request);
}
