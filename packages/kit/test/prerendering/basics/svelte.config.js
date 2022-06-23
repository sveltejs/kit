import { resolve } from 'path';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			default: true,
			onError: 'continue'
		},

		vite: {
			build: {
				minify: false
			},
			clearScreen: false,
			server: {
				fs: {
					allow: [resolve('../../../src')]
				}
			}
		}
	}
};

export default config;
