'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AuthenticatedImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
	fill?: boolean;
	sizes?: string;
	priority?: boolean;
	onLoad?: () => void;
	onError?: () => void;
}

/**
 * AuthenticatedImage component that handles authentication for private Supabase Storage images.
 * Automatically generates signed URLs for private buckets and falls back to public URLs for public buckets.
 */
export function AuthenticatedImage({
	src,
	alt,
	width,
	height,
	className,
	fill = false,
	sizes,
	priority = false,
	onLoad,
	onError,
}: AuthenticatedImageProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		const loadImage = async () => {
			try {
				setIsLoading(true);
				setError(false);

				const supabase = createClient();

				// Check if the image is from Supabase Storage
				if (src.startsWith('Media/') || src.startsWith('storage/') || src.includes('/storage/')) {
					// Extract bucket and file path from src
					let bucket: string;
					let filePath: string;

					if (src.startsWith('Media/')) {
						bucket = 'Media';
						filePath = src.substring(6); // Remove 'Media/' prefix
					} else {
						const pathParts = src.replace(/^storage\//, '').split('/');
						bucket = pathParts[0];
						filePath = pathParts.slice(1).join('/');
					}

					// Try to get signed URL for private bucket access
					const { data: signedUrl, error: signedUrlError } = await supabase.storage
						.from(bucket)
						.createSignedUrl(filePath, 3600); // 1 hour expiry

					if (signedUrlError) {
						console.warn('Failed to create signed URL, falling back to public URL:', signedUrlError);
						// Fallback to public URL
						const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
						setImageUrl(publicData.publicUrl);
					} else {
						setImageUrl(signedUrl.signedUrl);
					}
				} else {
					// For non-storage URLs, use as-is
					setImageUrl(src);
				}
			} catch (err) {
				console.error('Error loading image:', err);
				setError(true);
			} finally {
				setIsLoading(false);
			}
		};

		if (src) {
			loadImage();
		}
	}, [src]);

	if (error) {
		return (
			<div
				className={cn(
					'flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm',
					className
				)}
				style={fill ? {} : { width, height }}
			>
				Failed to load image
			</div>
		);
	}

	if (!imageUrl || isLoading) {
		return null;
	}

	// Use regular img tag instead of Next.js Image for dynamic URLs
	return (
		<img
			src={imageUrl}
			alt={alt}
			width={width}
			height={height}
			className={className}
			style={fill ? { width: '100%', height: '100%', objectFit: 'contain' } : {}}
			sizes={sizes}
			loading={priority ? 'eager' : 'lazy'}
			onLoad={onLoad}
			onError={onError}
		/>
	);
}

/**
 * Simple img version for cases where Next.js Image is not needed
 */
interface AuthenticatedImgProps {
	src: string;
	alt: string;
	className?: string;
	style?: React.CSSProperties;
	onLoad?: () => void;
	onError?: () => void;
}

export function AuthenticatedImg({
	src,
	alt,
	className,
	style,
	onLoad,
	onError,
}: AuthenticatedImgProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		const loadImage = async () => {
			try {
				setIsLoading(true);
				setError(false);

				const supabase = createClient();

				// Check if the image is from Supabase Storage
				if (src.startsWith('Media/') || src.startsWith('storage/') || src.includes('/storage/')) {
					// Extract bucket and file path from src
					let bucket: string;
					let filePath: string;

					if (src.startsWith('Media/')) {
						bucket = 'Media';
						filePath = src.substring(6); // Remove 'Media/' prefix
					} else {
						const pathParts = src.replace(/^storage\//, '').split('/');
						bucket = pathParts[0];
						filePath = pathParts.slice(1).join('/');
					}

					// Try to get signed URL for private bucket access
					const { data: signedUrl, error: signedUrlError } = await supabase.storage
						.from(bucket)
						.createSignedUrl(filePath, 3600); // 1 hour expiry

					if (signedUrlError) {
						console.warn('Failed to create signed URL, falling back to public URL:', signedUrlError);
						// Fallback to public URL
						const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
						setImageUrl(publicData.publicUrl);
					} else {
						setImageUrl(signedUrl.signedUrl);
					}
				} else {
					// For non-storage URLs, use as-is
					setImageUrl(src);
				}
			} catch (err) {
				console.error('Error loading image:', err);
				setError(true);
			} finally {
				setIsLoading(false);
			}
		};

		if (src) {
			loadImage();
		}
	}, [src]);

	if (error) {
		return (
			<div
				className={cn(
					'flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm',
					className
				)}
				style={style}
			>
				Failed to load image
			</div>
		);
	}

	if (!imageUrl || isLoading) {
		return (
			<div
				className={cn('flex items-center justify-center bg-neutral-100 animate-pulse', className)}
				style={style}
			>
				Loading...
			</div>
		);
	}

	return (
		<img
			src={imageUrl}
			alt={alt}
			className={className}
			style={style}
			onLoad={onLoad}
			onError={onError}
		/>
	);
}
