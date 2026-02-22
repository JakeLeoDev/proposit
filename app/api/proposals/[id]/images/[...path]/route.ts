import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateTokenAccess, validateUserAccess } from '@/lib/proposal-access-service';
import { getUser } from '@/lib/auth';

interface Params {
	params: Promise<{ id: string; path: string[] }>;
}

export async function GET(request: Request, { params }: Params) {
	const { id, path } = await params;
	const { searchParams } = new URL(request.url);
	const token = searchParams.get('token');

	let hasAccess = false;

	// Check if user is authenticated
	const user = await getUser();

	if (user) {
		// User is logged in - validate user access
		hasAccess = await validateUserAccess(id, user.id);
		if (!hasAccess) {
			return new NextResponse('Access denied', { status: 403 });
		}
	} else if (token) {
		// User is not logged in but provided a token - validate token
		const isValidToken = await validateTokenAccess(id, token);
		if (!isValidToken) {
			return new NextResponse('Invalid or expired token', { status: 401 });
		}
		hasAccess = true;
	} else {
		// No user and no token
		return new NextResponse('Authentication required', { status: 401 });
	}

	// Reconstruct the image path
	const imagePath = path.join('/');

	// Extract bucket and file path
	// All images are stored in the Media bucket
	const bucket = 'Media';
	let filePath: string;

	if (imagePath.startsWith('Media/')) {
		filePath = imagePath.substring(6); // Remove 'Media/' prefix
	} else {
		// Use the path as-is (it should be the file path within Media bucket)
		filePath = imagePath;
	}

	try {
		// Use service client for full storage access
		const supabase = createServiceClient();

		// Get the image file from Supabase Storage
		const { data, error } = await supabase.storage.from(bucket).download(filePath);

		if (error) {
			console.error('Error downloading image:', error);
			return new NextResponse('Image not found', { status: 404 });
		}

		if (!data) {
			return new NextResponse('Image not found', { status: 404 });
		}

		// Convert blob to buffer
		const buffer = await data.arrayBuffer();

		// Determine content type based on file extension
		const extension = filePath.split('.').pop()?.toLowerCase();
		let contentType = 'image/jpeg'; // default

		switch (extension) {
			case 'png':
				contentType = 'image/png';
				break;
			case 'gif':
				contentType = 'image/gif';
				break;
			case 'webp':
				contentType = 'image/webp';
				break;
			case 'svg':
				contentType = 'image/svg+xml';
				break;
			case 'bmp':
				contentType = 'image/bmp';
				break;
			case 'tiff':
			case 'tif':
				contentType = 'image/tiff';
				break;
		}

		return new NextResponse(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				'Content-Disposition': `inline; filename="${filePath.split('/').pop()}"`,
			},
		});
	} catch (error) {
		console.error('Error serving image:', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
