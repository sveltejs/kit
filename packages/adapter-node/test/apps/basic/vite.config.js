import process from 'node:process';

import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../index.js';

const no_static = !!process.env.NO_STATIC;

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			// The normal static directory contains HTML files, which can mask missing prerendered MIME types.
			...(no_static && {
				outDir: '.svelte-kit-no-static',
				files: { assets: 'static-missing' }
			}),
			adapter: adapter({
				envPrefix: 'MY_CUSTOM_',
				out: no_static ? 'build-no-static' : 'build'
			})
		})
	]
};

export default config;
