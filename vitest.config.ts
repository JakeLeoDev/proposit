import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['lib/**/__tests__/**/*.test.ts'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, '.'),
		},
	},
});
