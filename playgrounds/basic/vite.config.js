import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';

export default {
	plugins: [
		enhancedImages(),
		sveltekit({
			compilerOptions: {
				experimental: {
					// async: true
				}
			},

			adapter: adapter({
				fallback: 'prerendered.html'
			}),
			experimental: {
				remoteFunctions: true
			}
		})
	],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
};
