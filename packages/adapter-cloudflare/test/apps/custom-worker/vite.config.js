import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({ vitePluginOptions: { configPath: './config/wrangler.jsonc' } })
		})
	],
	server: {
		fs: {
			allow: ['../../../../kit']
		}
	}
};

export default config;
