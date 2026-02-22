import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import '../globals.css';

export const metadata = {
	title: 'Proposit',
	description: 'Create and manage proposals with your organization',
	icons: {
		icon: [{ url: '/Logo.png', type: 'image/png' }],
		apple: [{ url: '/Logo.png', sizes: '180x180', type: 'image/png' }],
		shortcut: '/Logo.png',
	},
};

interface Props {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
	const { locale } = await params;

	// Validate that the incoming `locale` parameter is valid
	if (!locales.includes(locale as 'en' | 'de')) {
		notFound();
	}

	// Providing all messages to the client
	// side is the easiest way to get started
	const messages = await getMessages();

	return (
		<html lang={locale} className="h-full">
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
                            (function() {
                                const savedTheme = localStorage.getItem('theme');
                                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                                const theme = savedTheme || systemTheme;
                                if (theme === 'dark') {
                                    document.documentElement.classList.add('dark');
                                }
                            })();
                        `,
					}}
				/>
			</head>
			<body className="h-full">
				<NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
			</body>
		</html>
	);
}
