/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		package: {
			files: {
				exclude: ['**/*exclude.{js,svelte}', '**/*.mjs']
			}
		}
	}
};

export default config;
