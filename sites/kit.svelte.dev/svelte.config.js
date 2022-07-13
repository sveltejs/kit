import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			default: true,
			entries: ['*', '/content.json']
		}
	}
};

export default config;
