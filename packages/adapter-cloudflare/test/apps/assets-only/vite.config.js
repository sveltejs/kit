import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit({
			adapter: adapter({
				worker: false
			})
		})
	]
};

export default config;
