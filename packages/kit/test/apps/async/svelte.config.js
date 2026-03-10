/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},

	kit: {
		experimental: {
			remoteFunctions: true,
			forkPreloads: true
		}
	}
};

export default config;
