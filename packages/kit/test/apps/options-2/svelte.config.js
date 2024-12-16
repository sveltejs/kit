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
		},
		output: {
			codeSplitJs: false
		}
	}
};

export default config;
