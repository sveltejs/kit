import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';

let server_builds = 0;

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
			})
		})
	]
};

export default config;
