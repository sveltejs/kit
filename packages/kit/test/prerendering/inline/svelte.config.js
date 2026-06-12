import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '200.html'
		}),

		output: {
			bundleStrategy: 'inline'
		}
	}
};

export default config;
