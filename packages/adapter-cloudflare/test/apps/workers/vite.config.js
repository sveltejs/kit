import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false,
		sourcemap: true
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				config: 'config/wrangler.jsonc'
			}),
			paths: { base: process.env.TEST_BASE ? '/base' : '' }
		})
	]
};

export default config;
