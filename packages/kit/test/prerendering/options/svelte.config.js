/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},

	kit: {
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
