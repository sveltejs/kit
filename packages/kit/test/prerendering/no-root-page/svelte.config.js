import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		prerender: {
			entries: ['*']
		}
	}
};

export default config;
