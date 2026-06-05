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
				vitePluginOptions: {
					config(user_config) {
						user_config.compatibility_date = '2026-04-22';
					}
				}
			})
		})
	],
	server: {
		fs: {
			allow: ['../../../../kit']
		}
	}
};

export default config;
