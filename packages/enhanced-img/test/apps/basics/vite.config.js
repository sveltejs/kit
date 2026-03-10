import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '../../../src/index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [enhancedImages(), sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../../kit/src')]
		}
	}
};

export default config;
