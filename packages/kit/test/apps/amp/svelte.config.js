/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		amp: true,
		vite: {
			server: {
				// TODO: required to support ipv6, remove on vite 3
				// https://github.com/vitejs/vite/issues/7075
				host: 'localhost'
			}
		}
	}
};

export default config;
