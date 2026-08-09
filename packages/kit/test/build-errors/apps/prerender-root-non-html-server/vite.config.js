import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
export default {
	build: {
		minify: false
	},

	clearScreen: false,

	logLevel: 'silent',

	plugins: [sveltekit()],

	server: {
		fs: {
			allow: [path.resolve('../../../../src')]
		}
	}
};
