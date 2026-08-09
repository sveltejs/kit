import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '../../../index.js';
import { cloudflare } from '@cloudflare/vite-plugin'

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				config: 'config/wrangler.jsonc'
			})
		}),
		cloudflare({
			configPath: 'config/wrangler.jsonc',
			config: user_config => {
				// Assets are handled by SvelteKit
				delete user_config.assets;
				user_config.name = 'adapter-cloudflare-test';

				return user_config;
			}
		}),
	]
};

export default config;
