import process from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		csp: {
			directives: {
				'require-trusted-types-for': ['script'],
				'trusted-types': ['svelte-trusted-html', 'sveltekit-trusted-url']
			}
		},
		paths: {
			base: '/basepath',
			relative: true
		},
		serviceWorker: {
			register: !!process.env.REGISTER_SERVICE_WORKER
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
