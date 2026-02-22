# Error Handling

Raw PostgreSQL/Supabase error messages are never shown to users. All service errors pass through a central mapping utility before reaching the UI.

## Flow

```
PostgreSQL error (code + raw message)
  → Supabase client (.error object)
  → Service class: throw mapServiceError(error, 'delete')
  → Store / component catch: err.message (already user-friendly)
  → toast.error(err.message) or <Alert>{localError}</Alert>
  → User sees: clear, actionable message
```

## Central Utility

**`lib/error-utils.ts`** — exports `mapServiceError(error, operation)`.

```ts
mapServiceError(error: unknown, operation: 'fetch' | 'create' | 'update' | 'delete'): Error
```

### PostgreSQL error codes handled

| Code      | Meaning               | User message                                                                                                  |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `23503`   | Foreign key violation | "This item cannot be deleted because it still has associated [links/versions/...]. Please remove them first." |
| `23505`   | Unique violation      | "An item with these details already exists. Please use different values."                                     |
| `23502`   | Not-null violation    | "A required field is missing. Please fill in all required fields."                                            |
| _(other)_ | Generic fallback      | Per-operation message (see below)                                                                             |

### Generic fallback messages (by operation)

| Operation | Message                                        |
| --------- | ---------------------------------------------- |
| `fetch`   | "Failed to load data. Please try again."       |
| `create`  | "Failed to save the item. Please try again."   |
| `update`  | "Failed to save changes. Please try again."    |
| `delete`  | "Failed to delete the item. Please try again." |

### FK constraint name parsing

For `23503` errors the utility extracts the related table from the constraint name via regex:

```
"links_proposal_id_fkey"  →  table prefix "links"  →  display name "links"
"proposal_versions_proposal_id_fkey"  →  "proposal_versions"  →  "versions"
```

The `FK_TABLE_DISPLAY_NAMES` map in `error-utils.ts` controls the human-readable display name. Add entries there when new FK-constrained tables are introduced.

## Usage in Service Classes

Every `if (error)` block in a `*-service.ts` file uses this pattern:

```ts
import { mapServiceError } from '@/lib/error-utils';

if (error) {
	throw mapServiceError(error, 'delete'); // or 'fetch' | 'create' | 'update'
}
```

Use the correct variable name when Supabase returns a named error variable (e.g. `fetchError`, `memberError`):

```ts
if (fetchError) {
	throw mapServiceError(fetchError, 'fetch');
}
```

**Do not** use `mapServiceError` for intentional business logic errors — keep those as plain `new Error('...')`:

```ts
throw new Error('Invitation not found'); // intentional — keep as-is
throw new Error('Invitation has expired'); // intentional — keep as-is
```

## UI Display

Errors reach the UI in two ways:

- **Sonner toast** (`toast.error(err.message)`) — used for delete operations and other background actions.
- **Inline Alert** in `CrudForm` and `DataTable` — shown as a `destructive` variant alert with an `AlertCircle` icon and a translated "Error" title.

The `destructive` Alert variant (`components/ui/alert.tsx`) has a subtle `bg-destructive/5` background and `border-destructive/30` border for visual polish.

## Extending

When adding a new entity that has FK relationships:

1. Add the table name to `FK_TABLE_DISPLAY_NAMES` in `lib/error-utils.ts` with a clear display label.
2. All service methods already use `mapServiceError` — no further changes needed.
