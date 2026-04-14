import { sveltekit } from '@sveltejs/kit/vite';
import svelteConfig from './svelte.config.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [sveltekit({ adapter: svelteConfig.kit?.adapter })],
	server: {
		fs: {
			allow: ['../../../../kit']
		}
	}
};

export default config;
