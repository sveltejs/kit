/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		output: {
			mjs: true
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
