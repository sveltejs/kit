import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import preprocess from 'svelte-preprocess';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: preprocess()
		})
	]
});
