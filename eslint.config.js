import svelteConfig from '@sveltejs/eslint-config';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	...svelteConfig,
	{
		rules: {
			'no-undef': 'off'
		}
	},
	{
		ignores: [
			'**/.svelte-kit',
			'packages/kit/test/prerendering/*/build',
			'packages/adapter-static/test/apps/*/build',
			'packages/adapter-cloudflare/files',
			'packages/adapter-netlify/files',
			'packages/adapter-node/files'
		]
	}
];
