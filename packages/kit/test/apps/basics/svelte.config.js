/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		output: {
			preloadStrategy: 'preload-mjs'
		},

		prerender: {
			handleHttpError: 'warn'
		},

		version: {
			name: 'TEST_VERSION'
		}
	}
};

export default config;
