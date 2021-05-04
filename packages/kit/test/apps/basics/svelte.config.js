/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		hostHeader: 'x-forwarded-host',
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
