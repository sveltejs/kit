import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	plugins: [svelte({ preprocess: [vitePreprocess()] })]
};
