import { sveltekit } from '@sveltejs/kit/vite';
import legacy from '@vitejs/plugin-legacy';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		legacy()
	],
	server: {
		fs: {
			strict: false
		}
	}
};

export default config;
