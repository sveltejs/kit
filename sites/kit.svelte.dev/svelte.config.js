import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ edge: true }),

		prerender: {
			default: true,
			entries: ['*', '/content.json']
		}
	}
};

export default config;
