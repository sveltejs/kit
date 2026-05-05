import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('vitest/config').ViteUserConfig} */
const config = {
	build: {
		minify: false
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [
		sveltekit({
			adapter: adapter()
		})
	],

	define: {
		'process.env.MY_ENV': '"MY_ENV DEFINED"'
	},

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},

	test: {
		globalSetup: path.join(import.meta.dirname, 'globalSetup.js')
	}
};

export default config;
