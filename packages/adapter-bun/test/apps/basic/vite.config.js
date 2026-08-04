import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '../../../index.js';

export default defineConfig({
	build: {
		minify: false
	},
	plugins: [
		sveltekit({
			adapter: adapter({
				envPrefix: 'MY_CUSTOM_',
				compile: process.env.COMPILE === 'true'
			})
		})
	]
});
