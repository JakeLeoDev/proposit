# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Keep this file up to date.** After major refactorings — new patterns, renamed directories, swapped libraries, changed data layer — update the relevant sections here so future sessions start with accurate context. When in doubt, re-read the codebase and correct anything that has drifted.

## Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm type-check   # TypeScript type checking (tsc --noEmit)
pnpm format       # Format with Prettier
pnpm format:check # Check formatting

pnpm db:start     # Start local Supabase (Docker required)
pnpm db:stop      # Stop local Supabase
pnpm db:push      # Push migrations to cloud database
pnpm db:reset     # Re-apply all migrations on local DB
pnpm db:migrate   # Create new migration file (pass name as argument)
```

## Tech Stack

Next.js 15 (App Router), TypeScript (strict), Supabase (auth + DB + realtime), Tailwind CSS + ShadCN UI (Radix primitives), Lexical (rich text editor), next-intl (i18n — en/de), Zustand + SWR (state/fetching), Zod (validation), @dnd-kit (drag & drop), Vercel AI SDK + Anthropic (AI assistant).

## Architecture

### Route Structure

All routes live under `app/[locale]/` with three layout groups:

- `(auth)` — login, signup, password reset. Redirects away if already authenticated.
- `(dashboard)` — protected routes. Layout enforces auth + organisation membership.
- `(public)` — public proposal viewing (`proposals/[id]`).

API routes are in `app/api/` (AI chat streaming, proposal PDF generation, organisation settings with encryption, MCP server endpoint).

### Server vs Client Components

**Critical rule**: never import server-only functions (`getUserOrganisation`, `cookies()`, `redirect()`) inside a `'use client'` component.

Standard pattern: a server component handles auth + data fetching, then renders a client component with the data as props.

```
page.tsx (server) → getUserOrganisation() → <SomeClient organisationId={…} />
```

Auth is **layout-based** (not middleware-based). The dashboard layout checks authentication and organisation membership; the auth layout redirects already-authenticated users.

### Data Layer

- **Supabase clients**: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/service.ts` (service role key).
- **Service classes** (`lib/*-service.ts`): consistent CRUD interface — `getEntities`, `createEntity`, `updateEntity`, `deleteEntity`, plus `subscribeTo*` for realtime.
- **Zustand stores** (`lib/stores/`): created via `createEntityStore()` factory with hydrate, loading, saving, and error states.
- **SWR** for client-side data fetching and caching.
- All queries are scoped by `organisation_id` (multi-tenant).

### Key Schema Notes

- **User profiles** live in `public.users` (linked to `auth.users` via a trigger on signup) — there is no `profiles` table.
- **Chat messages** are not persisted — the AI chat (`/api/chat`) is entirely ephemeral and has no database table.

### Reusable CRUD Components

Use the existing CRUD components instead of building custom ones:

- `components/crud/data-table.tsx` — table with realtime subscriptions, search, sort, row actions.
- `components/crud/crud-form.tsx` — form supporting text, textarea, richtext, select, password, number, date, file, autocomplete, and custom fields with change indicators.

Adding a new entity typically follows: define type in `lib/types.ts` → create service class → create server/client page pair using DataTable/CrudForm → add i18n keys → update sidebar navigation.

See `context/crud-components.md` for full prop references and the new-entity checklist.

## Database Migrations

Schema changes are managed via the Supabase CLI. All migrations live in `supabase/migrations/` and are committed to git. See `context/supabase-local-dev.md` for the full workflow.

**When a schema change is needed:**

1. `supabase migration new <snake_case_name>` — creates a new timestamped SQL file
2. Write the SQL (ALTER TABLE, CREATE TABLE, etc.)
3. `supabase db reset` — re-applies all migrations locally to verify
4. Update `lib/types.ts` to match
5. `git add supabase/migrations/ && git commit`
6. `supabase db push` — applies to the cloud database, before pushing/deploying code

**Rules:**

- Never make schema changes directly in the Supabase cloud Studio — always use migrations.
- Schema changes go **before** code deployment (DB must be ready when new code arrives).

## Conventions

- **Types ↔ Datenbank immer synchron halten**: Bei jeder Änderung — ob Bugfix, neues Feature oder Refactoring — müssen TypeScript-Typen (`lib/types.ts`) und Datenbank-Schema immer übereinstimmen. Wenn eine DB-Migration nötig ist, die Typen entsprechend anpassen und umgekehrt. Vor Änderungen das aktuelle Schema prüfen (`mcp__supabase__list_tables` / `mcp__supabase__execute_sql`), Migrationen via Migration-Dateien anwenden.
- **Database spelling**: British — `organisations`, `organisation_users`, `organisation_id`.
- **Notifications**: always use Sonner toasts (`sonner`), never inline alert banners.
- **No emojis**: never use emojis in UI text, code, comments, or any output in this project.
- **UI components**: prefer ShadCN UI from `@/components/ui/`. Use the `cn()` helper from `lib/utils.ts` for conditional classes.
- **Ordering**: decimal-based positioning for drag-and-drop (gaps of 1000, midpoint insertion).
- **Sensitive field encryption**: Fields like `ai_api_key` are encrypted server-side before writing to the DB. The pattern uses `lib/crypto.ts` (encrypt/decrypt) and `lib/encrypted-fields.ts` (field-level helpers). A `_hint` column stores a non-sensitive suffix for display (e.g. `...XXXX`). Sensitive writes go through a server API route (`app/api/organisations/route.ts`), never directly from the browser client. See `context/encryption.md`.
- **AI features**: Anthropic models, org-level API keys stored in the database, configurable system prompts, tool-calling functions defined in `lib/ai/`.
- **Proposal image tracking**: Images uploaded in the Lexical editor are tracked in a `proposal_images` table. On save, orphaned images are deleted from Supabase Storage. On proposal deletion, all associated files are cleaned up. See `context/proposal-images.md`.
- **MCP server**: External MCP clients can access AI tools via `POST /api/mcp` with bearer token authentication. Tokens are SHA-256 hashed (not encrypted) and stored in the `api_tokens` table. The MCP route uses `createServiceClient()` scoped by the token's `organisation_id`. See `context/mcp-server.md`.
- **PDF export**: `app/api/proposals/[id]/pdf/route.ts` renders by navigating a headless Chromium to the app's own `/[locale]/proposals/[id]/pdf` page — same Lexical/Tailwind pipeline as the on-screen preview, so PDF = preview byte-for-byte. The browser launcher lives in `lib/pdf/launch.ts` and auto-detects the runtime: full `puppeteer` on Node servers / VPS / Docker, `puppeteer-core` + `@sparticuz/chromium` on Vercel / Lambda. The route sets `maxDuration = 60` (Vercel Pro / Fluid Compute; Hobby caps at 10s and is too short). The render target URL resolves to `INTERNAL_APP_URL` → `VERCEL_URL` → `NEXT_PUBLIC_APP_URL` → `localhost:3000`. Puppeteer deps are listed in `serverExternalPackages` in `next.config.ts` — do not import them from client bundles.

## Code Style

- **Prettier**: tabs, single quotes, semicolons, trailing commas (es5), 100 char print width.
- **ESLint**: enforce `import type` for type-only imports, no unused vars.
- **Import order**: React/Next.js → third-party → internal components → utilities → type imports.
- **Naming**: kebab-case for files/folders, PascalCase for component names and types, SCREAMING_SNAKE_CASE for constants.

## i18n

Translation files live in `messages/en.json` and `messages/de.json`. Routes are locale-prefixed (`/en/dashboard`, `/de/dashboard`). Use `next-intl` hooks in client components, server utilities in server components.

**Every user-facing string must be translated** — no hardcoded text in components. When adding or changing features, always add translation keys to both `en.json` and `de.json`. This includes labels, placeholders, toast messages, dialog titles, error messages, button text, and aria labels. See `context/i18n.md` for the full guide, namespace reference, and checklist.

## MCP Servers

Two MCP servers are used (both local scope — not committed to git):

- **GitHub** — PR/issue access, code search
- **Supabase** — database schema, tables, RLS policies

See `context/mcp-setup.md` for setup instructions.

## Context Files

The `context/` folder contains reference documents that can be given to Claude as additional context. Key files:

- `context/supabase-local-dev.md` — local Supabase setup, migration workflow, env vars
- `context/mcp-setup.md` — how to set up the MCP servers for this project
- `context/crud-components.md` — DataTable and CrudForm prop reference, new-entity checklist
- `context/encryption.md` — server-side field encryption pattern (AES-256-GCM)
- `context/proposal-images.md` — proposal image tracking and orphan cleanup
- `context/mcp-server.md` — MCP server endpoint, token auth, tool adapter pattern
- `context/i18n.md` — i18n conventions, namespace reference, translation checklist
- `context/error-handling.md` — user-friendly error mapping, `mapDatabaseError` utility, FK display names
- `context/pdf-export-testing.md` — manual smoke-test checklist per PDF rendering tier

## Custom Commands

Slash-Commands in `.claude/commands/`:

- `/feature [name]` — vollstaendiger Feature-Workflow: Branch erstellen, Struktur anlegen, Checklist anzeigen.
- `/bug [beschreibung]` — Bug-Fix-Workflow: Branch erstellen, Code finden, analysieren, fixen, validieren.

## Environment

Copy `.env.example` to `.env.local`. Required variables:

| Variable                        | Description                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL (or `http://127.0.0.1:54321` locally)                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase secret/service role key (server-side only)                                            |
| `NEXT_PUBLIC_APP_URL`           | App base URL                                                                                   |
| `ENCRYPTION_KEY`                | 32 bytes hex-encoded — generate with `openssl rand -hex 32`                                    |
| `SMTP_HOST`                     | SMTP server host (optional — email features disabled if omitted)                               |
| `SMTP_PORT`                     | SMTP port (e.g. `587` or `465`)                                                                |
| `SMTP_SECURE`                   | `true` for TLS, `false` for STARTTLS                                                           |
| `SMTP_USER`                     | SMTP username                                                                                  |
| `SMTP_PASS`                     | SMTP password or API key                                                                       |
| `SMTP_FROM`                     | Sender address, e.g. `"My App <hello@example.com>"`                                            |
| `NEXT_PUBLIC_TENANT_MODE`       | `single` (default), `multi`, or `multi-invite` — controls registration behaviour (see below)   |
| `CONTACT_EMAIL`                 | Optional contact email shown on the blocked-registration page (server-side only)               |
| `INTERNAL_APP_URL`              | Internal URL Puppeteer uses for PDF generation (if the app is not reachable at localhost:3000) |

For local development, get the keys from `supabase start` output. See `context/supabase-local-dev.md`.

## Tenant Mode

Controlled by `NEXT_PUBLIC_TENANT_MODE` (default: `single`). Helper functions live in `lib/tenant-config.ts`.

- **`single`**: Only one organisation exists. The first user to register goes through the normal create-organisation wizard and becomes admin. After that, the signup page is blocked for everyone without an invitation token — further users must be invited by an admin.
- **`multi`**: Standard multi-tenant behaviour — open registration, each user creates their own organisation.
- **`multi-invite`**: Multiple organisations allowed, but self-registration is restricted to email addresses manually added to the `allowed_registrations` table (managed via Supabase Studio). Users with a valid organisation invitation token can still register regardless of the allowlist and will be added to the inviting organisation. Allowed emails go through the normal create-organisation wizard. Set `CONTACT_EMAIL` to show a contact address on the blocked-registration screen.
