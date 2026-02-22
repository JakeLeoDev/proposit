# MCP Server

The proposal tool exposes its AI tools via a Model Context Protocol (MCP) server endpoint, allowing external MCP clients (e.g. Claude Desktop, Claude Code) to interact with proposal data.

## Endpoint

`POST /api/mcp` — Streamable HTTP transport (stateless, no sessions)

Optional query parameter: `?proposal=<uuid>` — sets a default proposal ID for the `getProposal` tool.

## Authentication

Bearer token authentication using API tokens generated in User Settings > API Tokens.

### Token Flow

1. User creates a token in the UI — raw token (`pt_<base64url>`) is shown once
2. Only the SHA-256 hash is stored in the `api_tokens` table
3. On each MCP request, the bearer token is hashed and looked up via the service role client
4. `last_used_at` is updated fire-and-forget
5. Returns `userId` and `organisationId` from the token record

### Token Format

- Prefix: `pt_` followed by 32 random bytes encoded as base64url
- Display prefix stored in DB: first 11 chars + `...` (e.g. `pt_abc1def2...`)
- Hash: SHA-256 hex digest

## Architecture

### Key Files

| File                                                      | Purpose                                                 |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `app/api/mcp/route.ts`                                    | Next.js API route handler                               |
| `lib/mcp/auth.ts`                                         | Token authentication                                    |
| `lib/mcp/tool-adapter.ts`                                 | Converts Vercel AI SDK tools to MCP tools               |
| `lib/mcp/resources.ts`                                    | Registers MCP resources (system prompt, Lexical format) |
| `lib/mcp/prompts.ts`                                      | Registers MCP prompts (proposal-assistant)              |
| `lib/api-tokens-service.ts`                               | Client-side token CRUD (RLS-protected)                  |
| `app/[locale]/dashboard/settings/user/api-tokens-tab.tsx` | Token management UI                                     |

### Tool Adapter

The adapter (`lib/mcp/tool-adapter.ts`) bridges Vercel AI SDK tools to MCP:

1. Iterates tools from `createAllTools()`
2. Converts each tool's Zod v4 `inputSchema` to JSON Schema via `z.toJSONSchema()`
3. Registers on the MCP server with the tool's name, description, and JSON schema
4. Handler calls `tool.execute(args)` and wraps the result as MCP text content

### Service Role Client

The MCP route uses `createServiceClient()` (service role, bypasses RLS) since MCP requests don't carry Supabase session cookies. All queries are scoped by the `organisationId` from the authenticated token.

## Database

### `api_tokens` table

```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users(id)
organisation_id uuid REFERENCES organisations(id)
name            text
token_hash      text  -- SHA-256 hex
token_prefix    text  -- display prefix
last_used_at    timestamptz
created_at      timestamptz
```

RLS policies: users can only SELECT, INSERT, DELETE their own tokens.

## Resources

Static context exposed via `resources/list` and `resources/read`:

| URI                                 | Content                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| `proposit://context/system`         | Base system prompt (role, entities, tool guidelines, workflows) |
| `proposit://context/lexical-format` | Lexical editor node types and format specification              |

Resources are registered in `lib/mcp/resources.ts` and provide the same context the built-in chat assistant uses, so external MCP clients can work equally well.

## Prompts

MCP prompts exposed via `prompts/list` and `prompts/get`:

| Name                 | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `proposal-assistant` | Full system prompt (same as built-in chat). Accepts optional `proposalId` argument. |

The prompt fetches the organisation's custom `ai_system_prompt` from the DB and combines it with the base system prompt and optional proposal context.

## Testing

### List tools

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Call a tool

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"getCategoriesList","arguments":{}}}'
```

### With proposal context

```bash
curl -X POST "http://localhost:3000/api/mcp?proposal=<uuid>" \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### List resources

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/list"}'
```

### Read a resource

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"proposit://context/system"}}'
```

### List prompts

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list"}'
```

### Get a prompt

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer pt_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"prompts/get","params":{"name":"proposal-assistant","arguments":{"proposalId":"<uuid>"}}}'
```

## Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"proposit": {
			"url": "https://your-app.vercel.app/api/mcp",
			"headers": {
				"Authorization": "Bearer pt_your_token_here"
			}
		}
	}
}
```

### Claude Code

Add to `.mcp.json`:

```json
{
	"mcpServers": {
		"proposit": {
			"type": "streamable-http",
			"url": "https://your-app.vercel.app/api/mcp",
			"headers": {
				"Authorization": "Bearer pt_your_token_here"
			}
		}
	}
}
```
