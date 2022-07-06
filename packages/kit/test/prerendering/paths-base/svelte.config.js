import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		paths: {
			base: '/path-base'
		},

		prerender: {
			default: true
		}
	}
};

export default config;
