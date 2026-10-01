import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: { experimental: { async: true } },
	kit: {
		adapter: adapter({ split: true }),
		experimental: {
			instrumentation: {
				server: true
			},
			remoteFunctions: true
		}
	}
};

export default config;
