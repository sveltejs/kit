import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import inspect from 'vite-plugin-inspect';

export default {
	plugins: [inspect(), enhancedImages(), sveltekit()],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
};
