import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ split: true }),
		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
