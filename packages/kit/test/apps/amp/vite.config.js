import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		// TODO: remove when we stop testing for vite on node 18
		assetsInlineLimit: 0
	},
	clearScreen: false,
	plugins: [
		sveltekit({
			inlineStyleThreshold: Infinity
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
