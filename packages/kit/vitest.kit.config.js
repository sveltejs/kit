import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// this file needs a custom name so that the numerous test subprojects don't all pick it up
/** @param {string} specifier */
const mock = (specifier) => fileURLToPath(new URL(`./test/mocks/${specifier}.js`, import.meta.url));

const exclude = [
	'**/node_modules/**',
	'**/.svelte-kit/**',
	'**/.{idea,git,cache,output,temp}/**',
	'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
];

export default /** @satisfies {import('vitest/config').ViteUserConfig} */ ({
	plugins: [svelte({ compilerOptions: { hmr: false, experimental: { async: true } } })],
	define: {
		__SVELTEKIT_SERVER_TRACING_ENABLED__: false,
		__SVELTEKIT_APP_VERSION_POLL_INTERVAL__: 0,
		__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__: false
	},
	server: {
		watch: {
			ignored: ['**/node_modules/**', '**/.svelte-kit/**']
		}
	},
	test: {
		alias: {
			// Order matters: vite prefix-matches with trailing-slash, so longer keys must
			// come first to avoid `$app/paths` matching `$app/paths/internal/client`.
			'#app/paths': mock('app-paths'),
			'$app/env': mock('app-env'),
			'$app/paths/internal/client': mock('app-paths-internal-client'),
			'$app/paths/internal/server': mock('app-paths-internal-server')
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'kit-server-dev',
					environment: 'node',
					include: ['src/**/*.spec.js'],
					exclude: [...exclude, 'src/**/*.svelte.spec.js', 'src/runtime/client/**/*.spec.js']
				}
			},
			{
				extends: true,
				test: {
					name: 'kit-server-build',
					environment: 'node',
					env: {
						DEV: 'true'
					},
					include: ['src/runtime/server/page/csp.spec.js', 'src/runtime/server/cookie.spec.js'],
					exclude: [...exclude, 'src/**/*.svelte.spec.js']
				}
			},
			{
				test: {
					name: 'kit-basics-server',
					// for DOMParser; Request and Response stay Node's
					environment: 'jsdom',
					root: fileURLToPath(new URL('./test/apps/basics', import.meta.url)),
					include: ['unit-test/server.spec.js']
					// globalSetup: fileURLToPath(
					// 	new URL('./test/apps/basics/unit-test/server.setup.js', import.meta.url)
					// )
				}
			},
			{
				extends: true,
				resolve: {
					conditions: ['browser']
				},
				test: {
					name: 'kit-client-runtime',
					environment: 'jsdom',
					include: ['src/**/*.svelte.spec.js', 'src/runtime/client/**/*.spec.js'],
					exclude,
					// `forks` (child_process) accepts `--expose-gc`; `threads` (worker_threads) does not.
					pool: 'forks',
					maxWorkers: 1,
					execArgv: ['--expose-gc']
				}
			}
		]
	}
});
