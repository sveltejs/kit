import { sveltekit } from '@sveltejs/kit/vite';
import * as path from 'path';
import { imagetools } from 'vite-imagetools';

/** @type {import('vite').UserConfig} */
const config = {
	logLevel: 'info',

	plugins: [imagetools(), sveltekit()],

	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
