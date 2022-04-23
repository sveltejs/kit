import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		inlineStyleThreshold: Infinity,

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
