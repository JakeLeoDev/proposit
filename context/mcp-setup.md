# MCP Server Setup for Claude Code

This document describes how to set up the MCP (Model Context Protocol) servers used in this project. Both servers use **local scope** so no secrets end up in the repository.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- A **GitHub Fine-grained Personal Access Token** (from https://github.com/settings/tokens — select "Fine-grained tokens" and grant the permissions you need, e.g. repo, issues, pull requests)
- The **Supabase Project Ref** for your project (found in Supabase Project Settings > General, it's the ID in the project URL)

## 1. GitHub MCP Server

Gives Claude access to GitHub — PRs, issues, repos, code search, etc. Uses a fine-grained personal access token.

```bash
claude mcp add github --transport http "https://api.githubcopilot.com/mcp/" --scope local
```

Claude Code will prompt you to authenticate with your GitHub fine-grained PAT during setup.

## 2. Supabase MCP Server

Gives Claude access to the Supabase project — database schema, tables, queries, RLS policies, etc. Uses the hosted Supabase MCP endpoint (no local npm package needed).

```bash
claude mcp add supabase --transport http "https://mcp.supabase.com/mcp?project_ref=<your-project-ref>" --scope local
```

Claude Code will prompt you to authenticate with Supabase during setup.

## Verification

After adding both servers, verify they are running:

```bash
claude mcp list
```

Inside Claude Code you can also run `/mcp` to see the status of all connected servers.

## Troubleshooting

- **Server not connecting**: Run `claude mcp list` to check status. Remove and re-add if needed with `claude mcp remove <name>`.
- **Authentication issues**: Re-run the `claude mcp add` command to re-authenticate.
- **GitHub token expired**: Generate a new fine-grained token at https://github.com/settings/tokens and re-add the server.
