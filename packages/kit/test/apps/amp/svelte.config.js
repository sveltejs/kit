/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		amp: true,
		vite: {
			server: {
				fs: {
					strict: true
				}
			}
		}
	}
};

export default config;
