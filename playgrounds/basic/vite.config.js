import adapter from '@sveltejs/adapter-node';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';

export default {
	plugins: [enhancedImages(), sveltekit({ adapter: adapter() })],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
};
