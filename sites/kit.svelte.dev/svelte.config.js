import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'edge',
			images: {
			  minimumCacheTTL: 300,
			  formats: ['image/avif', 'image/webp'],
			  sizes: [480, 1024, 1920, 2560],
			  domains: []
			}
		}),

		paths: {
			relative: true
		}
	}
};

export default config;
