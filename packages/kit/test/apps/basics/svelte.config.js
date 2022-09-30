/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		prerender: {
			onError: 'continue'
		}
	}
};

export default config;
