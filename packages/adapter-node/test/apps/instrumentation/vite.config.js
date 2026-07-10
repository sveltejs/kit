import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../index.js';

/** @type {import('vite').UserConfig} */
export default {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	]
};
