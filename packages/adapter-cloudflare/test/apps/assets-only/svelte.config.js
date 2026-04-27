import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ worker: false })
	}
};

export default config;
