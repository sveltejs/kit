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
				fs: {
					allow: [path.resolve('../../../src')]
				}
			}
		}
	}
};

export default config;
