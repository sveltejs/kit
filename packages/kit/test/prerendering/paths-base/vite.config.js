import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		// disable inlining to test asset base path
		assetsInlineLimit: 0
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [
		sveltekit({
			adapter: adapter()
		})
	],

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
