import type { Config } from 'tailwindcss';

const config: Config = {
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	plugins: [require('tailwindcss-animate')],
};

export default config;
