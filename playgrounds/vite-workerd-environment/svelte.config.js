import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';
import { workerd } from '@dario-hacking/vite-6-alpha-environment-provider-workerd';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		ssrEnvironment: workerd({})
	},
	preprocess: [vitePreprocess()]
};

export default config;
