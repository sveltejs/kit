import path from 'path';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		vite: {
			build: {
				minify: false
			},
			clearScreen: false,
			server: {
				fs: {
					allow: [path.resolve('../../../src')]
				}
			}
		}
	}
};

export default config;
