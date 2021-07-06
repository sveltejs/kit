import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		target: '#svelte',
		vite: {
			server: {
				fs: {
					strict: true
				}
			}
		}
	}
};

export default config;
