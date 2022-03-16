import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			default: true
		},

		vite: {
			build: {
				minify: false
			}
		}
	}
};

export default config;
