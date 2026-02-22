import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'de'] as const;
export const defaultLocale = 'en' as const;

export default getRequestConfig(async ({ requestLocale }) => {
	// This typically corresponds to the `[locale]` segment
	const requested = await requestLocale;

	// Check if the incoming locale is valid
	const locale = requested && locales.includes(requested as any) ? requested : defaultLocale;

	return {
		locale,
		messages: (await import(`./messages/${locale}.json`)).default,
	};
});
