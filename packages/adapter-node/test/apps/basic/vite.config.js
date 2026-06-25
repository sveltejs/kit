import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				envPrefix: 'MY_CUSTOM_'
			}),
			typescript: {
				config(config) {
					config.include.push('../playwright.config.js');
				}
			}
		})
	]
};

export default config;
