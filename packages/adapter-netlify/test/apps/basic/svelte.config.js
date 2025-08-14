import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		experimental: {
			instrumentation: {
				serverFile: true
			}
		}
	}
};

export default config;
