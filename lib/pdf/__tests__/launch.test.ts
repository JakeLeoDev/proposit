import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isServerlessRuntime, launchBrowser, resolveInternalAppUrl } from '../launch';

vi.mock('puppeteer', () => ({
	default: {
		launch: vi.fn().mockResolvedValue({ close: vi.fn() }),
	},
}));

vi.mock('puppeteer-core', () => ({
	launch: vi.fn().mockResolvedValue({ close: vi.fn() }),
}));

vi.mock('@sparticuz/chromium', () => ({
	default: {
		args: ['--mock-serverless-arg'],
		executablePath: vi.fn().mockResolvedValue('/tmp/chromium'),
	},
}));

beforeEach(() => {
	// Isolate env — the test process may itself inject VERCEL/VERCEL_URL when
	// run in CI, which would contaminate the precedence checks below.
	vi.stubEnv('VERCEL', '');
	vi.stubEnv('VERCEL_URL', '');
	vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', '');
	vi.stubEnv('INTERNAL_APP_URL', '');
	vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
	vi.stubEnv('PUPPETEER_EXECUTABLE_PATH', '');
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});

describe('isServerlessRuntime', () => {
	it('returns false when no serverless env vars are set', () => {
		expect(isServerlessRuntime()).toBe(false);
	});

	it('returns true when VERCEL is set', () => {
		vi.stubEnv('VERCEL', '1');
		expect(isServerlessRuntime()).toBe(true);
	});

	it('returns true when AWS_LAMBDA_FUNCTION_NAME is set', () => {
		vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'my-fn');
		expect(isServerlessRuntime()).toBe(true);
	});
});

describe('resolveInternalAppUrl', () => {
	it('prefers INTERNAL_APP_URL over everything else', () => {
		vi.stubEnv('INTERNAL_APP_URL', 'http://internal:3000');
		vi.stubEnv('VERCEL_URL', 'deployment.vercel.app');
		vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://public.example.com');
		expect(resolveInternalAppUrl()).toBe('http://internal:3000');
	});

	it('falls back to VERCEL_URL (https-prefixed) when INTERNAL_APP_URL is unset', () => {
		vi.stubEnv('VERCEL_URL', 'deployment.vercel.app');
		vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://public.example.com');
		expect(resolveInternalAppUrl()).toBe('https://deployment.vercel.app');
	});

	it('falls back to NEXT_PUBLIC_APP_URL when VERCEL_URL is unset', () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://public.example.com');
		expect(resolveInternalAppUrl()).toBe('https://public.example.com');
	});

	it('defaults to http://localhost:3000 when nothing is set', () => {
		expect(resolveInternalAppUrl()).toBe('http://localhost:3000');
	});
});

describe('launchBrowser', () => {
	it('uses puppeteer-core + @sparticuz/chromium on Vercel', async () => {
		vi.stubEnv('VERCEL', '1');

		await launchBrowser();

		const puppeteerCore = await import('puppeteer-core');
		const puppeteer = await import('puppeteer');

		expect(puppeteerCore.launch).toHaveBeenCalledTimes(1);
		expect(puppeteer.default.launch).not.toHaveBeenCalled();

		const opts = vi.mocked(puppeteerCore.launch).mock.calls[0][0]!;
		expect(opts.args).toEqual(['--mock-serverless-arg']);
		expect(opts.executablePath).toBe('/tmp/chromium');
		expect(opts.headless).toBe(true);
	});

	it('uses puppeteer-core + @sparticuz/chromium on AWS Lambda', async () => {
		vi.stubEnv('AWS_LAMBDA_FUNCTION_NAME', 'my-fn');

		await launchBrowser();

		const puppeteerCore = await import('puppeteer-core');
		expect(puppeteerCore.launch).toHaveBeenCalledTimes(1);
	});

	it('uses full puppeteer with bundled Chromium outside serverless', async () => {
		await launchBrowser();

		const puppeteerCore = await import('puppeteer-core');
		const puppeteer = await import('puppeteer');

		expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);
		expect(puppeteerCore.launch).not.toHaveBeenCalled();

		const opts = vi.mocked(puppeteer.default.launch).mock.calls[0][0]!;
		expect(opts.headless).toBe(true);
		expect(opts.args).toContain('--no-sandbox');
		// executablePath unset → puppeteer uses its bundled Chromium
		expect(opts.executablePath).toBeUndefined();
	});

	it('honours PUPPETEER_EXECUTABLE_PATH in the non-serverless path', async () => {
		vi.stubEnv('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/chromium');

		await launchBrowser();

		const puppeteer = await import('puppeteer');
		const opts = vi.mocked(puppeteer.default.launch).mock.calls[0][0]!;
		expect(opts.executablePath).toBe('/usr/bin/chromium');
	});
});
