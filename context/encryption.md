# Server-Side Field Encryption

This document describes the encryption pattern used for sensitive database fields (e.g. API keys).

## Overview

Sensitive fields are encrypted at rest using **AES-256-GCM** before being written to the database. Encryption and decryption happen exclusively on the server — the browser client never sees or sends plaintext encrypted values directly to Supabase.

## Key Files

| File                                  | Purpose                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/crypto.ts`                       | Low-level `encrypt()`, `decrypt()`, `isEncrypted()` functions using Node.js `crypto`                |
| `lib/encrypted-fields.ts`             | Field-level helpers: `encryptFields()`, `decryptFields()`, `getFieldHint()`                         |
| `app/api/organisations/route.ts`      | Server API route that accepts sensitive field updates, encrypts them, and writes via service client |
| `lib/auth.ts` (`getUserOrganisation`) | Decrypts sensitive fields server-side before passing data to client components                      |

## Encrypted Value Format

```
iv:authTag:ciphertext
```

All three segments are Base64-encoded. The `isEncrypted()` heuristic checks for this three-part colon-separated Base64 format.

## Environment

Requires `ENCRYPTION_KEY` environment variable — a 32-byte key hex-encoded (64 hex characters).

```bash
# Generate a key
openssl rand -hex 32
```

## How It Works

### Writing (encrypt)

1. Client sends plaintext value to `PATCH /api/organisations`
2. Server route calls `encrypt(plaintext)` → stores `iv:authTag:ciphertext` in DB
3. Server also stores a `_hint` column (e.g. `ai_api_key_hint = "...XXXX"`) for safe display

### Reading (decrypt)

1. `getUserOrganisation()` in `lib/auth.ts` fetches the organisation row
2. Calls `decryptFields(org, ['ai_api_key'])` before returning
3. `decryptFields` checks `isEncrypted()` — if the value looks encrypted, decrypt it; otherwise return as-is (handles transition from plaintext to encrypted)

### Client-side safety

- `organisationsService.updateOrganisation()` strips `ai_api_key` from updates (`{ ai_api_key: _stripped, ...safeUpdates }`) so the browser client can never accidentally write a plaintext key
- The organisation settings UI shows a `Badge` with the hint ("Key configured, ends in ...XXXX") instead of the actual key
- The `ai_api_key` input field is always empty on load — entering a value replaces the stored key

## Adding a New Encrypted Field

1. Add the field and a corresponding `_hint` column to the DB table
2. Add the field name to the `decryptFields()` call in `lib/auth.ts`
3. Handle encryption in the relevant server API route (like `app/api/organisations/route.ts`)
4. Strip the field from client-side update functions to prevent plaintext writes
5. Update `lib/types.ts` with the new `_hint` field
