import path from 'path';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '200.html'
		}),

		prerender: {
			default: true
		},

		trailingSlash: 'always',

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
