import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		experimental: {
			explicitEnvironmentVariables: true
		}
	}
};

export default config;
