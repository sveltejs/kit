import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';
import { node } from '../../packages/kit/src/exports/vite/dev/default_environment.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		environments: {
			ssr: node()
		}
	},
	preprocess: [vitePreprocess()]
};

export default config;
