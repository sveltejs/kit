import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			onError: 'continue',
			origin: 'http://example.com'
		}
	}
};

export default config;
