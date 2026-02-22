import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error(
			'ENCRYPTION_KEY environment variable is not set. Generate one with: openssl rand -hex 32'
		);
	}
	if (key.length !== 64) {
		throw new Error(
			'ENCRYPTION_KEY must be 32 bytes hex-encoded (64 hex characters). Generate one with: openssl rand -hex 32'
		);
	}
	return Buffer.from(key, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string in the format: `iv:authTag:ciphertext` (all Base64-encoded).
 */
export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	let encrypted = cipher.update(plaintext, 'utf8', 'base64');
	encrypted += cipher.final('base64');

	const authTag = cipher.getAuthTag();

	return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string (format: `iv:authTag:ciphertext`).
 */
export function decrypt(encrypted: string): string {
	const key = getEncryptionKey();
	const parts = encrypted.split(':');

	if (parts.length !== 3) {
		throw new Error('Invalid encrypted value format. Expected iv:authTag:ciphertext');
	}

	const [ivBase64, authTagBase64, ciphertext] = parts;
	const iv = Buffer.from(ivBase64, 'base64');
	const authTag = Buffer.from(authTagBase64, 'base64');

	if (iv.length !== IV_LENGTH) {
		throw new Error('Invalid IV length');
	}
	if (authTag.length !== AUTH_TAG_LENGTH) {
		throw new Error('Invalid auth tag length');
	}

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
	decrypted += decipher.final('utf8');

	return decrypted;
}

/**
 * Heuristic to check if a value looks like it was encrypted by this module.
 * Checks for three Base64-encoded segments separated by colons.
 */
export function isEncrypted(value: string): boolean {
	const parts = value.split(':');
	if (parts.length !== 3) return false;

	const base64Regex = /^[A-Za-z0-9+/]+=*$/;
	return parts.every((part) => base64Regex.test(part) && part.length > 0);
}
