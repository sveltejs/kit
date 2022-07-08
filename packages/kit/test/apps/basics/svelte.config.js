/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		prerender: {
			onError: 'continue'
		},
		methodOverride: {
			allowed: ['PUT', 'PATCH', 'DELETE']
		}
	}
};

export default config;
