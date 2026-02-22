import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createClient } from '@/lib/supabase/client';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Sanitize text by escaping HTML entities
 */
export function sanitizeText(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Get text content from a ChatMessage
 */
export function getTextFromMessage(message: {
	parts?: Array<{ type: string; text?: string }>;
}): string {
	if (!message.parts) return '';
	return message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text || '')
		.join('\n')
		.trim();
}

export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

/**
 * Get public URL for a file stored in Supabase Storage
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @returns The public URL for the file
 * @deprecated Use getAuthenticatedStorageUrl instead for private buckets
 */
export function getStorageUrl(bucket: string, filePath: string | null | undefined): string | null {
	if (!filePath) return null;

	const supabase = createClient();
	const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
	return data.publicUrl;
}

/**
 * Get authenticated URL for a file stored in Supabase Storage
 * Creates signed URLs for private buckets and falls back to public URLs
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Promise that resolves to the authenticated URL
 */
export async function getAuthenticatedStorageUrl(
	bucket: string,
	filePath: string | null | undefined,
	expiresIn: number = 3600
): Promise<string | null> {
	if (!filePath) return null;

	const supabase = createClient();

	try {
		// Try to create signed URL for private bucket access
		const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);

		if (error) {
			console.warn('Failed to create signed URL, falling back to public URL:', error);
			// Fallback to public URL
			const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
			return publicData.publicUrl;
		}

		return data.signedUrl;
	} catch (err) {
		console.error('Error creating authenticated URL:', err);
		// Fallback to public URL
		const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
		return publicData.publicUrl;
	}
}
