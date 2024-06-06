import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// https://github.com/sveltejs/kit/issues/12305
		teardownTimeout: 100
	},
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
});
