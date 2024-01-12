import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'edge'
		}),

		importMap: {
			enabled: true
		},

		paths: {
			relative: true
		}
	}
};

export default config;
