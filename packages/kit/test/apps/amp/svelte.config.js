import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		hydratable: false
	},
	kit: {
		browser: {
			router: false
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
