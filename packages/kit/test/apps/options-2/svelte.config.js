/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			base: '/basepath'
		},
		serviceWorker: {
			register: false
		},
		env: {
			dir: '../../env'
		},
		output: {
			bundleStrategy: 'single'
		},
		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
