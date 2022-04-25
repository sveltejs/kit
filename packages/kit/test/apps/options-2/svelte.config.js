import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			base: '/basepath'
		},
		serviceWorker: {
			register: false
		},
		vite: {
			server: {
				// TODO: required to support ipv6, remove on vite 3
				// https://github.com/vitejs/vite/issues/7075
				host: 'localhost',
				fs: {
					allow: [path.resolve('../../../src')]
				}
			}
		}
	}
};

export default config;
