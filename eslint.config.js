import svelte_config from '@sveltejs/eslint-config';
import noExportsToRuntimeImports from './.eslint/no-exports-to-runtime-imports.js';
import noRuntimeToExportsImports from './.eslint/no-runtime-to-exports-imports.js';
import requirePathToFileURL from './.eslint/require-path-to-file-url.js';

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
		files: ['packages/kit/src/exports/**/*.js'],
		plugins: {
			'kit-exports-custom': {
				rules: {
					'no-exports-to-runtime-imports': noExportsToRuntimeImports
				}
			}
		},
		rules: {
			'kit-exports-custom/no-exports-to-runtime-imports': 'error'
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
		// code that runs in Node, where dynamic imports of absolute paths
		// need `pathToFileURL` to work on Windows
		files: [
			'packages/kit/src/**/*.js',
			'packages/adapter-*/*.js',
			'packages/adapter-*/src/**/*.js',
			'packages/package/src/**/*.js'
		],
		// the client runtime's dynamic imports are resolved by vite, not Node
		ignores: ['packages/kit/src/runtime/**'],
		plugins: {
			'kit-node-custom': {
				rules: {
					'require-path-to-file-url': requirePathToFileURL
				}
			}
		},
		rules: {
			'kit-node-custom/require-path-to-file-url': 'error'
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
			'packages/adapter-node/files',
			'packages/kit/src/core/config/fixtures/multiple', // dir contains svelte config with multiple extensions tripping eslint
			'packages/kit/src/core/sync/create_manifest_data/test/samples/**/*',
			'packages/kit/src/core/sync/write_types/test/*/**/*',
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
