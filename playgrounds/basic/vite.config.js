import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';

export default {
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
				// remoteFunctions: true
			}
		})
	],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
};
