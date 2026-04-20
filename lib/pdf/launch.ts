import type { Browser } from 'puppeteer-core';

// Vercel sets VERCEL=1, AWS Lambda sets AWS_LAMBDA_FUNCTION_NAME.
// When running in a serverless function we cannot use the full `puppeteer`
// package because its bundled Chromium exceeds the 50 MB function size limit.
// Instead we fall back to `puppeteer-core` + `@sparticuz/chromium`, a stripped
// Chromium build purpose-made for Lambda-class environments.
export function isServerlessRuntime(): boolean {
	return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

// Resolves the URL Chromium should navigate to when rendering a proposal.
// Precedence:
//   1. INTERNAL_APP_URL    — explicit override (e.g. internal Docker hostname)
//   2. VERCEL_URL          — current Vercel deployment; safe default on Vercel
//                            because it points at the exact build that's
//                            running (works for preview + prod, avoids
//                            accidentally hitting prod from a preview fn)
//   3. NEXT_PUBLIC_APP_URL — configured public URL
//   4. http://localhost:3000
export function resolveInternalAppUrl(): string {
	if (process.env.INTERNAL_APP_URL) return process.env.INTERNAL_APP_URL;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
	return 'http://localhost:3000';
}

export async function launchBrowser(): Promise<Browser> {
	if (isServerlessRuntime()) {
		const { default: chromium } = await import('@sparticuz/chromium');
		const puppeteer = await import('puppeteer-core');
		return (await puppeteer.launch({
			args: chromium.args,
			executablePath: await chromium.executablePath(),
			headless: true,
		})) as Browser;
	}

	const puppeteer = await import('puppeteer');
	return (await puppeteer.default.launch({
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-gpu',
			'--no-zygote',
			'--single-process',
		],
		executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
	})) as unknown as Browser;
}
