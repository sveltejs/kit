/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		browser: {
			router: false,
			hydrate: false
		},

		inlineStyleThreshold: Infinity
	}
};

export default config;
