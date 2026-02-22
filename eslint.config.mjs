import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends(
		'next/core-web-vitals',
		'next/typescript',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:jsx-a11y/recommended',
		'prettier'
	),
	{
		rules: {
			// TypeScript specific rules
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',

			'@typescript-eslint/no-var-requires': 'error',

			// Import rules
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports',
				},
			],

			// React specific rules
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'react/jsx-no-target-blank': 'error',
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',

			// General rules
			'no-var': 'error',
			semi: ['error', 'always'],
			quotes: ['error', 'single'],
			'no-console': 'warn',
			'no-debugger': 'error',
		},
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
		},
	},
];

export default eslintConfig;
