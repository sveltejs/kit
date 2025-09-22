import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// we need to append the current directory because Vitest's workspace config
// doesn't correctly resolve relative paths in `include`
const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		minify: false
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [sveltekit()],

	define: {
		'process.env.MY_ENV': '"MY_ENV DEFINED"'
	},

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},

	test: {
		globalSetup: `${dir}/globalSetup.js`,
		include: [`${dir}/test/**/*.spec.js`]
	}
});
