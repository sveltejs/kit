import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	optimizeDeps: {
		exclude: ['svelte']
	}
};

export default config;
