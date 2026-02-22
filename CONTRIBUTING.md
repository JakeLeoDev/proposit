# Contributing to Proposit

Thank you for your interest in contributing. This document covers how to get the project running locally and the process for submitting changes.

## Local Setup

### Prerequisites

- Node.js 18.17+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Docker Desktop (required for local Supabase)

### Steps

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/proposit.git
cd proposit

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment variables
cp .env.example .env.local

# 4. Start local Supabase (starts Postgres, Auth, Storage, Studio)
pnpm db:start

# 5. Apply all migrations and seed data
pnpm db:reset

# 6. Start the dev server
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000). Local Supabase Studio is at [http://localhost:54323](http://localhost:54323).

Seed credentials: `max.mustermann@example.com` / `password123`

See `context/supabase-local-dev.md` for the full local database workflow.

## Making Changes

### Branches

- Branch off `main` for bug fixes: `fix/short-description`
- Branch off `main` for features: `feat/short-description`

### Schema changes

If your change requires a database schema change:

```bash
pnpm db:migrate <migration-name>   # creates a new migration file
# edit the generated file in supabase/migrations/
pnpm db:reset                      # verify locally
```

Update `lib/types.ts` to match. Schema migrations must be included in the same PR as the code that depends on them.

### Code style

```bash
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier
pnpm type-check   # TypeScript
```

All three must pass before opening a PR. The project uses tabs, single quotes, and strict TypeScript — see `.eslintrc` and `.prettierrc` for details.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short description>
```

Common types:

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature or user-facing improvement                  |
| `fix`      | Bug fix                                                 |
| `chore`    | Dependency updates, config changes, tooling             |
| `docs`     | Documentation only                                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `ci`       | Changes to GitHub Actions workflows                     |

Examples:

```
feat: add PDF export for proposals
fix: correct organisation_id scoping in companies query
chore: update puppeteer to v25
docs: add SMTP setup instructions to README
```

Keep the description short (under 72 characters), imperative, and lowercase. No trailing period.

For breaking changes, add `!` after the type: `feat!: rename organisation endpoint`.

## Submitting a Pull Request

1. Ensure `pnpm lint`, `pnpm type-check`, and `pnpm build` all pass
2. Keep PRs focused — one logical change per PR
3. Describe what changed and why in the PR description
4. Reference any related issues with `Closes #123`

For larger changes or new features, open an issue first to discuss the approach before writing code.

## Questions

Open an issue for questions about the codebase or contribution process.
