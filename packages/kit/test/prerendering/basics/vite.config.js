import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vitest/config').UserConfig} */
const config = {
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
		globalSetup: './globalSetup.js'
	}
};

export default config;
