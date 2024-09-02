import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-auto';
import { cloudflare } from '@flarelabs-net/vite-environment-provider-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		environments: {
			ssr: cloudflare()
		}
	},
	preprocess: [vitePreprocess()]
};

export default config;
