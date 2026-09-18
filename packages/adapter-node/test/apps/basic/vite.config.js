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
			})
		}),
		{
			name: 'test-user-server-module',
			enforce: 'post',
			resolveId(id) {
				if (id === 'SERVER') return '\0test-user-server-module';
			},
			load(id) {
				if (id === '\0test-user-server-module') {
					return `export const value = 'user-server'`;
				}
			}
		}
	]
};

export default config;
