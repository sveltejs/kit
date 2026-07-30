import svelte_config from '@sveltejs/eslint-config';
import noRuntimeToExportsImports from './.eslint/no-runtime-to-exports-imports.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...svelte_config,
	{
		rules: {
			'no-undef': 'off',
			// we have some non-reactive state in our runtime modules, and we don't want to be nagged about it
			'svelte/prefer-svelte-reactivity': 'off'
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
			'**/.netlify',
			'**/.vercel',
			'**/.wrangler',
			'**/test-results',
			'**/dist',
			'**/.custom-out-dir',
			'packages/adapter-*/files',
			'!packages/adapter-vercel/files/serverless.js',
			'packages/kit/src/core/config/fixtures/multiple', // dir contains svelte config with multiple extensions tripping eslint
			'packages/kit/src/core/sync/create_manifest_data/test/samples/**/*',
			'packages/kit/types/index.d.ts', // generated file
			'packages/*/test/apps/**/*',
			'packages/*/test/**/build/**',
			'packages/kit/test/build-errors/**/*',
			'packages/kit/test/prerendering/**/*',
			'packages/test-redirect-importer/index.js',
			'packages/package/test/errors/**/*',
			'packages/package/test/fixtures/**/*',
			'packages/package/test/watch/expected/**/*',
			'packages/package/test/watch/package/**/*',
			'packages/adapter-node/smoke.spec_disabled.js'
		]
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['packages/kit/src/runtime/app/service-worker/index.js']
				}
			}
		},
		rules: {
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					// we turn these off because it's common to pass an async callback to
					// a synchronous callback parameter such as `setTimeout(...)`
					checksVoidReturn: {
						arguments: false,
						properties: false
					}
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true
				}
			]
		}
	}
];
