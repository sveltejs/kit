/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		amp: true,
		vite: {
			resolve: {
				alias: {
					'@sveltejs/kit/router': new URL('../../../src/router.js', import.meta.url).pathname
				}
			}
		}
	}
};

export default config;
