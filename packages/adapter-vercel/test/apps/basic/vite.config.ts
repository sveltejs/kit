import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-vercel';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			appDir: process.env.APP_DIR,
			paths: { base: process.env.PATHS_BASE },
			output: {
				bundleStrategy: process.env.BUNDLE_STRATEGY as 'split' | 'single' | 'inline' | undefined
			}
		})
	]
});
