import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type { import("eslint").Linter.FlatConfig[] } */
export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	{
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.browser,
				...globals.es2017,
				...globals.node
			}
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'package/', 'vite.config.ts.*']
	}
];
