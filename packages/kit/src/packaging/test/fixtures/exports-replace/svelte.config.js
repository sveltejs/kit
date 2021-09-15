/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		package: {
			exports: {
				exclude: ['**']
			}
		}
	}
};

export default config;
