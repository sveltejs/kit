import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		// lower threshold to prevent inline to test asset base path
		assetsInlineLimit: 100
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [sveltekit()],

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
