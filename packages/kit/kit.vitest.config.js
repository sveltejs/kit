import { defineConfig } from 'vitest/config';
import { svelteKitTest } from './src/exports/test/vitest.js';

// this file needs a custom name so that the numerous test subprojects don't all pick it up
export default defineConfig({
	// dogfood our own plugin
	plugins: [svelteKitTest()],
	define: {
		__SVELTEKIT_SERVER_TRACING_ENABLED__: false
	},
	server: {
		watch: {
			ignored: ['**/node_modules/**', '**/.svelte-kit/**']
		}
	},
	test: {
		pool: 'threads',
		maxWorkers: 1,
		include: ['src/**/*.spec.js'],
		exclude: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/.{idea,git,cache,output,temp}/**',
			'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
		]
	}
});
