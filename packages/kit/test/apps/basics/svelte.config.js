/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		headers: {
			host: 'x-forwarded-host',
			protocol: 'x-forwarded-proto'
		},
		vite: {
			build: {
				minify: false
			},
			clearScreen: false,
			optimizeDeps: {
				// for CI, we need to explicitly prebundle deps, since
				// the reload confuses Playwright
				include: ['cookie', 'marked']
			}
		}
	}
};

export default config;
