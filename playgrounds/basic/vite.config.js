import { sveltekit } from '@sveltejs/kit/vite';

export default {
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: ['../../packages/kit']
		}
	}
};
