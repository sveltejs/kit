/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		package: {
			files: {
				exclude: ['**/exclude.js', '*.mjs']
			}
		}
	}
};

export default config;
