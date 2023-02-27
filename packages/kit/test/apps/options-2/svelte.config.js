/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			base: '/basepath',
			relative: true
		},
		serviceWorker: {
			register: false
		},
		env: {
			dir: '../../env'
		}
	}
};

export default config;
