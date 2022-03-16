import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '200.html'
		}),

		vite: {
			build: {
				minify: false
			}
		}
	}
};

export default config;
