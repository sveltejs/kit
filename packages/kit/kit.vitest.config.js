import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// this file needs a custom name so that the numerous test subprojects don't all pick it up
export default defineConfig({
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
			'__sveltekit/paths': fileURLToPath(new URL('./test/mocks/path.js', import.meta.url))
		},
		poolOptions: {
			threads: {
				singleThread: true
			}
		},
		include: ['src/**/*.spec.js'],
		exclude: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/.{idea,git,cache,output,temp}/**',
			'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
		]
	}
});
