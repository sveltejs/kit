/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			base: '/basepath'
		},
		serviceWorker: {
			register: false
		}
	}
};

export default config;
