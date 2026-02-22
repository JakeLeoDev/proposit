# Proposal Image Tracking

This document describes how images uploaded in the Lexical editor are tracked and cleaned up.

## Overview

When a user uploads an image via the editor toolbar, the file is stored in the Supabase `Media` bucket and a reference is inserted into the `proposal_images` table. On save, orphaned images (removed from content) are deleted from both the tracking table and storage. On proposal deletion, all associated storage files are cleaned up.

## Key Files

| File                                          | Purpose                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/types.ts` (`ProposalImage`)              | TypeScript type for the tracking table                                                                |
| `lib/lexical-config.ts` (`extractImagePaths`) | Recursively extracts all image `src` paths from a Lexical JSON tree                                   |
| `lib/proposals-service.ts`                    | `syncProposalImages()` — diffing & cleanup on save; `deleteProposalImages()` — full cleanup on delete |
| `components/editor/toolbar.tsx`               | Inserts a tracking row when an image is uploaded                                                      |
| `components/editor/editor-context.tsx`        | Provides `proposalId` to the toolbar via React context                                                |

## Database Table

**`proposal_images`**

| Column            | Type                      | Description                             |
| ----------------- | ------------------------- | --------------------------------------- |
| `id`              | uuid (PK)                 | Auto-generated                          |
| `proposal_id`     | uuid (FK → proposals)     | CASCADE delete                          |
| `organisation_id` | uuid (FK → organisations) | Multi-tenant scoping                    |
| `storage_path`    | text                      | Relative path within the `Media` bucket |
| `created_at`      | timestamptz               | Auto-generated                          |

## How It Works

### Upload (toolbar)

1. User picks a file via the toolbar image button
2. File is uploaded to `Media` bucket at `organisations/{orgId}/editor-images/{timestamp}.{ext}`
3. A row is inserted into `proposal_images` with the `storage_path`
4. An `ImageNode` is inserted into the Lexical tree with `src` = the public URL

### Save (sync)

When `proposalsService.updateProposal()` is called with content changes:

1. `extractImagePaths(content)` walks the Lexical JSON tree and collects all image `src` values
2. Existing tracked paths are fetched from `proposal_images`
3. **New paths** (in content but not tracked) → insert tracking rows
4. **Orphaned paths** (tracked but not in content) → delete from `Media` bucket + delete tracking rows

Sync is non-blocking — failures are logged but don't prevent the proposal save.

### Delete (cleanup)

When `proposalsService.deleteProposal()` is called:

1. All `storage_path` values for the proposal are fetched from `proposal_images`
2. Files are deleted from the `Media` bucket
3. DB rows are CASCADE-deleted when the proposal row is removed

## Storage Path Convention

```
organisations/{organisationId}/editor-images/{timestamp}.{extension}
```

Paths stored in `proposal_images.storage_path` are relative to the `Media` bucket root (no leading slash, no bucket name prefix).
