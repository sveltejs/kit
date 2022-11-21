import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '200.html'
		}),

		csp: {
			directives: {
				'script-src': ['self']
			}
		},

		files: {
			assets: 'public'
		},

		paths: {
			base: '/path-base',
			assets: 'https://cdn.example.com/stuff'
		}
	}
};

export default config;
