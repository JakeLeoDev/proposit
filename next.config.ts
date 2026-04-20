import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
	// Disable ESLint during build to avoid linting errors
	eslint: {
		ignoreDuringBuilds: true,
	},
	// Disable TypeScript type checking during build
	typescript: {
		ignoreBuildErrors: true,
	},
	// Keep the PDF rendering deps out of the Next.js bundle. They resolve native
	// binaries + platform-specific files at runtime, which the bundler cannot
	// trace reliably and which would otherwise blow past Vercel's 50 MB limit.
	serverExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium'],
	// Images are loaded from Supabase Storage, whose hostname depends on the
	// self-hosted deployment (NEXT_PUBLIC_SUPABASE_URL). Because each installation
	// uses a different host we allow all hostnames here. If you know your Supabase
	// hostname you can restrict this to e.g. { hostname: '*.supabase.co' }.
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**',
			},
			{
				protocol: 'http',
				hostname: '127.0.0.1',
			},
		],
	},
};

export default withNextIntl(nextConfig);
