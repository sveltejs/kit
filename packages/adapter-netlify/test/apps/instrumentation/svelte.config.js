/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		experimental: {
			instrumentation: {
				server: true
			}
		}
	}
};

export default config;
