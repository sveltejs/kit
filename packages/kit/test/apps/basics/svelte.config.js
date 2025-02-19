import process from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: {
			name: 'test-adapter',
			adapt() {},
			emulate(opts) {
				return {
					async beforeRequest(req, res, next) {
						const middleware = await opts.importEntryPoint('test-adapter-middleware');
						await middleware.default(req, res, next);
					},
					platform({ config, prerender }) {
						return { config, prerender };
					}
				};
			},
			supports: {
				read: () => true
			},
			additionalEntryPoints: () => [
				{
					name: 'test-adapter-middleware',
					file: 'test-adapter-middleware.js',
					allowedFeatures: []
				}
			]
		},

		prerender: {
			entries: [
				'*',
				'/routing/prerendered/trailing-slash/always/',
				'/routing/prerendered/trailing-slash/never',
				'/routing/prerendered/trailing-slash/ignore'
			],
			handleHttpError: 'warn'
		},

		version: {
			name: 'TEST_VERSION'
		},
		router: {
			resolution: /** @type {'client' | 'server'} */ (process.env.ROUTER_RESOLUTION) || 'client'
		}
	}
};

export default config;
