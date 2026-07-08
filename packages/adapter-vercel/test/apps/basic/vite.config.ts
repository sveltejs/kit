import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '../../../index.js';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	]
});
