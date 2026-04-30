import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [
		sveltekit({
			adapter: adapter({
				fallback: '200.html'
			})
		})
	],

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
