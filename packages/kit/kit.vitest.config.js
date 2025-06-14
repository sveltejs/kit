import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// this file needs a custom name so that the numerous test subprojects don't all pick it up
export default defineConfig({
	server: {
		watch: {
			ignored: ['**/node_modules/**', '**/.svelte-kit/**']
		}
	},
	test: {
		alias: {
			'__sveltekit/paths': fileURLToPath(new URL('./test/mocks/path.js', import.meta.url))
		},
		// shave a couple seconds off the tests
		isolate: false,
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
