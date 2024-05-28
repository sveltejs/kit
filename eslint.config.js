import svelte_config from '@sveltejs/eslint-config';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	...svelte_config,
	{
		rules: {
			'@typescript-eslint/no-unused-expressions': 'off',
			'no-undef': 'off'
		}
	},
	{
		ignores: [
			'**/.svelte-kit',
			'packages/adapter-static/test/apps/*/build',
			'packages/adapter-cloudflare/files',
			'packages/adapter-netlify/files',
			'packages/adapter-node/files'
		]
	}
];
