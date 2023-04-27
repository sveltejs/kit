import { vitePluginSvelteImage } from '@sveltejs/image/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		vitePluginSvelteImage({ providers: { default: '@sveltejs/image/providers/vercel' } }),
		sveltekit()
	],
	server: {
		fs: {
			strict: false
		}
	}
});
