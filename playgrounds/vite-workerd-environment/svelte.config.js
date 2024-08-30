import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';
import { workerd as cloudflare } from '@dario-hacking/vite-6-alpha-environment-provider-workerd';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		environments: {
			ssr: cloudflare({})
		}
	},
	preprocess: [vitePreprocess()]
};

export default config;
