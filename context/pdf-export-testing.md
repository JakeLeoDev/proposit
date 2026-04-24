# PDF export — manual smoke tests

Unit tests (`lib/pdf/__tests__/launch.test.ts`) cover the environment-detection
and URL-precedence logic. They do **not** verify that Chromium actually renders
a proposal — that requires a running app, a database, auth, and a browser
binary, which is out of scope for the unit test suite.

Run these manual checks before shipping a change that touches PDF export.

## Tier 1 — serverless path (`@sparticuz/chromium` on Vercel)

**When to run:** before a Vercel-bound release; after bumping `puppeteer-core`
or `@sparticuz/chromium`.

**Prerequisites:**

- Vercel Pro plan (or Fluid Compute). Hobby's 10-second function timeout is
  usually too short; the route sets `maxDuration = 60`.
- Supabase project reachable from the Vercel deployment (cloud or self-hosted).
- A seeded proposal with at least one product collection and rich-text content.

**Steps:**

1. Deploy a branch to Vercel preview (`vercel --prod=false` or push to a PR branch).
2. Log in to the preview URL as an org admin.
3. Open an existing proposal with non-trivial content (rich text, images,
   a product collection of at least ~10 items).
4. Go to Preview → click Export PDF.
5. Expected: PDF downloads within ~20-40 seconds. Open it and verify:
   - Cover page matches the on-screen preview byte-for-byte (fonts, colours,
     logo position).
   - Images render (not broken-image placeholders).
   - Tables/collections are not cut off mid-row between pages.
   - Dark-mode users still get a light PDF (the route forces light).
6. Check the Vercel function log — no `[PDF] requestfailed` or `[PDF] response >=400`
   entries for the proposal page.

**Common failure modes:**

- `Serverfehler - bitte versuchen Sie es später erneut` → open Vercel function
  logs. If you see an ENOENT on the chromium binary, `@sparticuz/chromium`
  probably wasn't bundled as an external package — re-check
  `serverExternalPackages` in `next.config.ts`.
- Timeout at exactly 10 s → you're on Hobby plan. Upgrade or set
  `maxDuration` lower and accept that large proposals won't render.
- PDF renders but content is a login page → the render-target URL is wrong.
  Inspect the URL resolution: `INTERNAL_APP_URL` > `VERCEL_URL` >
  `NEXT_PUBLIC_APP_URL`. If the function calls `localhost:3000` it means none
  of those are set.

## Tier 2 — full puppeteer path (Node host, Docker, VPS)

**When to run:** before any release; after bumping `puppeteer`.

**Prerequisites:**

- `pnpm dev` running locally, **or** a Docker/Railway/Fly.io/VPS deployment.
- Local Supabase (`pnpm db:start`) or cloud Supabase.

**Steps:**

1. `pnpm dev`
2. Seed at least one proposal (via UI or `supabase/seed.sql`).
3. Open the proposal's Preview → Export PDF.
4. Expected: PDF downloads within ~3-8 seconds. Same visual checks as Tier 1.
5. Re-run export three times in a row. All should succeed — no hung browser
   processes should accumulate (check `ps aux | grep chrome` on the host).

**Common failure modes:**

- `Failed to launch the browser process` on ARM Linux (e.g. Raspberry Pi, some
  VPS) → set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` and install the
  system package.
- PDF is blank or dark → the `prefers-color-scheme: light` media emulation
  isn't being respected by a custom style. Check browser devtools on the
  proposal page with `?preview=true` and emulate print media.

## Tier 3 — external renderer (not yet implemented)

Escape hatch discussed in [issue #7](https://github.com/JakeLeoDev/proposit/issues/7).
When/if this is built, add a section here covering:

- How the `PDF_RENDERER_URL` env var selects the external path.
- How to stand up a Gotenberg container for local testing.
- Auth flow (signed URL / JWT) between the Next.js route and the renderer.

Until then, there is nothing to smoke-test for Tier 3.

## Regression checklist (copy into PRs that touch PDF export)

- [ ] `pnpm test lib/pdf` passes
- [ ] Tier 2 manual: at least one export from `pnpm dev`
- [ ] Tier 1 manual: at least one export from a Vercel preview deployment
- [ ] No `[PDF]` warnings/errors in the server log during the successful export
- [ ] `pnpm build` succeeds (catches `serverExternalPackages` regressions)
