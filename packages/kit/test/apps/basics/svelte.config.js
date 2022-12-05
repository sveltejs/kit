/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		prerender: {
			handleHttpError: 'warn'
		},

		version: {
			name: 'TEST_VERSION'
		}
	}
};

export default config;
