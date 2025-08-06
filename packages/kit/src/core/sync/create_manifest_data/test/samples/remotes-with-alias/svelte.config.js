/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		experimental: {
			remoteFunctions: true
		},
		alias: {
			$modules: './src/modules'
		}
	}
};

export default config;
