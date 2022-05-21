import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		browser: {
			router: false,
			hydrate: false
		},

		inlineStyleThreshold: Infinity,

		vite: {
			server: {
				fs: {
					allow: [path.resolve('../../../src')]
				},

				// TODO: required to support ipv6, remove on vite 3
				// https://github.com/vitejs/vite/issues/7075
				host: 'localhost'
			}
		}
	}
};

export default config;
