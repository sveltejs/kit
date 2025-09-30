import adapter from '../../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError: (det) => {
				const { status, message } = det;
				console.log(`error from svelte.config.js -> config.kit.prerender.handleHttpError(): \n`);
				console.log(det);
				if (status >= 400 && status < 500) {
					return 'warn';
				}
				throw new Error(message);
			}
		}
	}
};

export default config;