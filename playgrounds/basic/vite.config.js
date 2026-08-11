import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		sveltekit({
			compilerOptions: {
				experimental: {
					async: true
				}
			},

			adapter: adapter(),
			experimental: {
				remoteFunctions: true
			},

			router: {
				resolution: 'server'
			}
		})
	],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
});
