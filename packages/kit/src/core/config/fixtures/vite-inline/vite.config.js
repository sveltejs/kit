import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			paths: {
				base: '/from-vite'
			},
			// a vite-plugin-svelte option that SvelteKit doesn't use itself —
			// it should be passed through rather than treated as a Kit option
			inspector: true
		})
	]
});
