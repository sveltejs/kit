import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	worker: {
		plugins: [sveltekit()],
		format: 'es'
	}
});
