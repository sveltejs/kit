import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import adapter from '../../../index.js';

const config: UserConfig = {
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter(),
			experimental: {
				instrumentation: {
					server: true
				}
			}
		})
	]
};

export default config;
