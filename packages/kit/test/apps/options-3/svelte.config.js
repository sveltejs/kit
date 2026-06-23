/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		output: {
			bundleStrategy: 'inline'
		},
		serviceWorker: {
			register: false
		}
	}
};

export default config;
