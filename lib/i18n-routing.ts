import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
	// A list of all locales that are supported
	locales: ['en', 'de'],

	// Used when no locale matches
	defaultLocale: 'en',

	// The `pathnames` object maps pathnames to localized versions.
	pathnames: {
		// If all locales use the same pathname, a single
		// string or function can be provided for brevity
		'/': '/',
		'/auth/login': '/auth/login',
		'/auth/signup': '/auth/signup',
		'/dashboard': '/dashboard',
		'/proposals/[id]': '/proposals/[id]',
	},
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
