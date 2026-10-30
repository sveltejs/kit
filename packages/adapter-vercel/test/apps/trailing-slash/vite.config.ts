import process from 'node:process';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-vercel';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			paths: { base: process.env.BASE_PATH ?? '' }
		})
	]
});
