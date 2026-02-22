import { encrypt, decrypt, isEncrypted } from '@/lib/crypto';

/**
 * Encrypts specified fields in a data object before writing to the database.
 * Fields that are null/undefined are left untouched.
 */
export function encryptFields<T extends Record<string, any>>(data: T, fieldNames: (keyof T)[]): T {
	const result = { ...data };
	for (const field of fieldNames) {
		const value = result[field];
		if (typeof value === 'string' && value.length > 0) {
			(result as any)[field] = encrypt(value);
		}
	}
	return result;
}

/**
 * Decrypts specified fields in a data object after reading from the database.
 * Handles the transition period: if a value doesn't look encrypted, it's returned as-is.
 */
export function decryptFields<T extends Record<string, any>>(data: T, fieldNames: (keyof T)[]): T {
	const result = { ...data };
	for (const field of fieldNames) {
		const value = result[field];
		if (typeof value === 'string' && value.length > 0) {
			if (isEncrypted(value)) {
				(result as any)[field] = decrypt(value);
			}
			// If not encrypted (plaintext from before migration), return as-is
		}
	}
	return result;
}

/**
 * Returns a hint string for a sensitive value (e.g., "...XXXX").
 * Returns null if the value is empty/null.
 */
export function getFieldHint(value: string | null | undefined): string | null {
	if (!value || value.length === 0) return null;
	const lastFour = value.slice(-4);
	return `...${lastFour}`;
}
