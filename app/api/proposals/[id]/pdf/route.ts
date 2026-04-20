import { NextResponse } from 'next/server';
import { checkProposalAccess } from '@/lib/proposal-access-service';
import { getUser } from '@/lib/auth';
import { launchBrowser, resolveInternalAppUrl } from '@/lib/pdf/launch';
import { createServiceClient } from '@/lib/supabase/server';

// PDF rendering is slow. Claim up to 60s on Vercel Pro / Fluid Compute. Hobby
// plan caps this at 10s, which is usually too short for a full proposal.
export const maxDuration = 60;

interface Params {
	params: { id: string };
}

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const { searchParams } = new URL(request.url);
	const locale = searchParams.get('locale') ?? 'en';
	const token = searchParams.get('token');
	const preview = searchParams.get('preview');

	// Check access before generating PDF
	const authHeader = request.headers.get('authorization');
	const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

	// Get current user if authenticated (only if no token provided)
	let userId: string | null = null;
	if (!token) {
		const user = await getUser();
		userId = user?.id || null;
	}

	// Validate access using the new service
	const { hasAccess } = await checkProposalAccess(id, userId, token || null);
	if (!hasAccess) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	// Get proposal number for filename
	const supabase = createServiceClient();
	const { data: proposal } = await supabase
		.from('proposals')
		.select('proposal_number')
		.eq('id', id)
		.maybeSingle();

	const proposalNumber = proposal?.proposal_number;
	const filename = proposalNumber ? `Angebot Nr. ${proposalNumber}.pdf` : `proposal-${id}.pdf`;

	// Build the URL for puppeteer
	const queryParams: string[] = [];
	const configuredBase = resolveInternalAppUrl();
	// Only drop TLS when the target is actually localhost (dev / docker without
	// TLS). Real public URLs — Vercel, custom domains — must keep https.
	const parsedBase = new URL(configuredBase);
	const isLocalhost = ['localhost', '127.0.0.1'].includes(parsedBase.hostname);
	const httpUrl = isLocalhost ? configuredBase.replace(/^https:/, 'http:') : configuredBase;
	let url = `${httpUrl}/${locale}/proposals/${id}/pdf`;
	if (token) {
		queryParams.push(`token=${token}`);
	}
	if (preview === 'true') {
		queryParams.push('preview=true');
	}
	if (queryParams.length > 0) {
		url += `?${queryParams.join('&')}`;
	}

	const browser = await launchBrowser();
	try {
		const page = await browser.newPage();
		// Force light mode so dark system themes don't affect the PDF
		await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
		// Increase default navigation timeout
		page.setDefaultNavigationTimeout(120000);
		// Useful request/response diagnostics
		page.on('requestfailed', (req) => {
			// eslint-disable-next-line no-console
			console.error('[PDF] requestfailed', {
				url: req.url(),
				method: req.method(),
				failure: req.failure()?.errorText,
			});
		});
		page.on('response', (res) => {
			const status = res.status();
			if (status >= 400) {
				// eslint-disable-next-line no-console
				console.error('[PDF] response >=400', { url: res.url(), status });
			}
		});
		// Use the HTTP URL for setting cookies (without the path)
		const { origin: originUrl } = new URL(httpUrl);
		const cookiesToSet = [] as { name: string; value: string; url: string }[];

		const cookieHeader = request.headers.get('cookie');
		if (cookieHeader) {
			cookieHeader.split(';').forEach((cookie) => {
				const [name, ...rest] = cookie.trim().split('=');
				if (name && rest.length > 0) {
					cookiesToSet.push({
						name,
						value: rest.join('='),
						url: originUrl,
					});
				}
			});
		}

		if (accessToken) {
			cookiesToSet.push({
				name: 'sb-access-token',
				value: accessToken,
				url: originUrl,
			});
		}

		if (cookiesToSet.length > 0) {
			await page.setCookie(...cookiesToSet);
		}

		// Try stricter first, then relax if needed
		try {
			await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn(
				'[PDF] First navigation attempt failed, retrying with domcontentloaded',
				String(err)
			);
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
		}

		// Wait for content to fully render
		// Support both legacy A4 pages and new auto-paginated content
		await page.waitForSelector('.a4-page, .auto-paginated-page', { timeout: 10000 });

		// Force light mode: remove dark class that may have been added by the theme script
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
		});

		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '0mm',
				right: '0mm',
				bottom: '0mm',
				left: '0mm',
			},
			displayHeaderFooter: false,
			preferCSSPageSize: true,
		});
		const arrayBuffer = pdfBuffer.buffer.slice(
			pdfBuffer.byteOffset,
			pdfBuffer.byteOffset + pdfBuffer.byteLength
		) as ArrayBuffer;
		return new Response(arrayBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		});
	} finally {
		await browser.close();
	}
}
