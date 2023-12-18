/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		prerender: {
			handleHttpError: 'warn'
		}
	}
};

export default config;
