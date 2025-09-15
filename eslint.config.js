import svelte_config from '@sveltejs/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...svelte_config,
	{
		rules: {
			'no-undef': 'off'
		}
	},
	{
		ignores: [
			'**/.svelte-kit',
			'**/test-results',
			'**/build',
			'**/.custom-out-dir',
			'packages/adapter-*/files',
			'packages/kit/src/core/config/fixtures/multiple', // dir contains svelte config with multiple extensions tripping eslint
			'packages/package/test/fixtures/typescript-svelte-config/expected',
			'packages/package/test/errors/**/*',
			'packages/package/test/fixtures/**/*'
		]
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true
			}
		},
		rules: {
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-floating-promises': 'error'
		},
		ignores: [
			'packages/adapter-cloudflare/test/apps/**/*',
			'packages/adapter-netlify/test/apps/**/*',
			'packages/adapter-node/rollup.config.js',
			'packages/adapter-node/tests/smoke.spec_disabled.js',
			'packages/adapter-static/test/apps/**/*',
			'packages/create-svelte/shared/**/*',
			'packages/create-svelte/templates/**/*',
			'packages/kit/src/core/sync/create_manifest_data/test/samples/**/*',
			'packages/kit/test/apps/**/*',
			'packages/kit/test/build-errors/**/*',
			'packages/kit/test/prerendering/**/*',
			'packages/test-redirect-importer/index.js'
		]
	}
];
