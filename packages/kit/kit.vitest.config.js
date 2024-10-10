import { defineConfig } from 'vitest/config';

// this file needs a custom name so that the numerous test subprojects don't all pick it up
export default defineConfig({
	server: {
		watch: {
			ignored: ['**/node_modules/**', '**/.svelte-kit/**']
		}
	},
	test: {
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
