import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// shave a couple seconds off the tests
		isolate: false,
		singleThread: true,
		include: ['src/**/*.spec.js'],
		exclude: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/.{idea,git,cache,output,temp}/**',
			'**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
		],
		watchExclude: ['**/node_modules/**', '**/.svelte-kit/**']
	}
});
