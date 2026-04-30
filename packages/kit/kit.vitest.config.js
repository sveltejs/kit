import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// this file needs a custom name so that the numerous test subprojects don't all pick it up
/** @param {string} specifier */
const mock = (specifier) => fileURLToPath(new URL(`./test/mocks/${specifier}.js`, import.meta.url));

const exclude = [
	'**/node_modules/**',
	'**/.svelte-kit/**',
	'**/.{idea,git,cache,output,temp}/**',
	'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
];

export default defineConfig({
	plugins: [svelte({ compilerOptions: { hmr: false } })],
	define: {
		__SVELTEKIT_SERVER_TRACING_ENABLED__: false
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
			'$app/paths/internal/client': mock('app-paths-internal-client'),
			'$app/paths/internal/server': mock('app-paths-internal-server'),
			'$app/paths': mock('app-paths'),
			'__sveltekit/environment': mock('sveltekit-environment'),
			'__sveltekit/paths': mock('sveltekit-paths')
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.spec.js'],
					exclude: [...exclude, 'src/**/*.svelte.spec.js']
				}
			},
			{
				extends: true,
				test: {
					name: 'client',
					environment: 'happy-dom',
					include: ['src/**/*.svelte.spec.js'],
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
