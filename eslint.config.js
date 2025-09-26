import svelte_config from '@sveltejs/eslint-config';
import noRuntimeToExportsImports from './.eslint/no-runtime-to-exports-imports.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...svelte_config,
	{
		rules: {
			'no-undef': 'off'
		}
	},
	{
		files: ['packages/kit/src/runtime/**/*.js'],
		plugins: {
			'kit-custom': {
				rules: {
					'no-runtime-to-exports-imports': noRuntimeToExportsImports
				}
			}
		},
		rules: {
			'kit-custom/no-runtime-to-exports-imports': 'error'
		}
	},
	{
		ignores: [
			'**/.svelte-kit',
			'**/.wrangler',
			'**/test-results',
			'**/build',
			'**/dist',
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
			'packages/kit/src/core/sync/create_manifest_data/test/samples/**/*',
			'packages/kit/test/apps/**/*',
			'packages/kit/test/build-errors/**/*',
			'packages/kit/test/prerendering/**/*',
			'packages/test-redirect-importer/index.js'
		]
	}
];
