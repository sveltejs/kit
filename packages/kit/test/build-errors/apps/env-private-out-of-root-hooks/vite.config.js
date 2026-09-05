import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit({
			files: {
				hooks: {
					client: '../../shared-hooks/hooks.client.js'
				}
			}
		})
	]
};

export default config;
