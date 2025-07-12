import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import csvasset from './custom_asset_plugin.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		// disable inlining to test asset base path
		assetsInlineLimit: 0
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [csvasset(), sveltekit()],

	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
