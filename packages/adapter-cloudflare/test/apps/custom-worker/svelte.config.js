/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			assets: 'https://cdn.example.com/stuff'
		},
		experimental: {
			remoteFunctions: true
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
