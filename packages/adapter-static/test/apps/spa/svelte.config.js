import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '200.html'
		}),
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
