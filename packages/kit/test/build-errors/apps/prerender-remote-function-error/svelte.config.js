import adapter from '../../../../../adapter-auto/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
