# Supabase Local Development

## Overview

Schema changes are version-controlled via migration files in `supabase/migrations/`. The Supabase CLI manages local and remote database state.

```
supabase/
  config.toml          # Local Supabase configuration
  migrations/          # All schema changes as SQL files (committed to git)
  seed.sql             # Sample data for local dev (no production data)
```

## Prerequisites

```bash
brew install supabase/tap/supabase
brew install --cask docker          # Docker Desktop required for local DB
```

## Initial Setup (first time)

```bash
supabase login                                          # opens browser auth
supabase link --project-ref <your-project-ref>          # link to cloud project
```

## Local Development

```bash
supabase start    # start local Postgres + Studio + Auth (requires Docker)
supabase stop     # stop all local services
```

After `supabase start`, the local URLs are:

| Service          | URL                                                     |
| ---------------- | ------------------------------------------------------- |
| Studio (UI)      | http://127.0.0.1:54323                                  |
| API              | http://127.0.0.1:54321                                  |
| DB (direct)      | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit (emails) | http://127.0.0.1:54324                                  |

Emails sent locally (signup, invitations) are NOT delivered — they appear in **Mailpit** at port 54324.

## Local .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<secret key from supabase start output>
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
```

The publishable and secret keys are printed by `supabase start`. They are stable for a given local instance (reset only if `supabase stop --no-backup` is used).

## Making Schema Changes

```bash
# 1. Create a new migration file
supabase migration new add_something

# 2. Write the SQL in supabase/migrations/<timestamp>_add_something.sql
#    Example: ALTER TABLE proposals ADD COLUMN foo text;

# 3. Apply to local DB (if running locally)
supabase db reset     # re-applies all migrations from scratch

# 4. Update lib/types.ts to match

# 5. Commit
git add supabase/migrations/
git commit -m "chore: add <description> migration"

# 6. Apply to cloud DB — before pushing/deploying the code
supabase db push
```

## Rules

- **Never** change the schema directly in the Supabase cloud Studio — always use migration files.
- **Always** run `supabase db push` before deploying code that depends on a new schema.
- **Never** edit existing migration files after they have been pushed — create a new migration instead.
- Migration files contain only DDL (structure). Application data is never stored in migrations.

## Checking Migration State

```bash
supabase migration list    # shows which migrations are applied locally vs. remotely
```

## Embedding Trigger Functions

The embedding trigger functions (`trigger_embed_generic`, `trigger_update_embed_generic`, etc.) call the `embed-content` Edge Function via `net.http_post`. They read the project URL and anon key from Postgres settings:

```sql
-- Set once per deployment in the Supabase SQL editor:
ALTER DATABASE postgres SET app.supabase_url = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET app.supabase_anon_key = '<your-anon-key>';
```

For local development these triggers will fail silently (embeddings won't be generated) unless the settings are configured for the local instance.
