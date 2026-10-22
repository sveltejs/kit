import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				envPrefix: 'MY_CUSTOM_'
			})
		})
	]
};

export default config;
