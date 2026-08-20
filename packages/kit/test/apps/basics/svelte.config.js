import process from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: {
			name: 'test-adapter',
			adapt(builder) {
				builder.instrument({
					entrypoint: `${builder.getServerDirectory()}/index.js`,
					instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`,
					module: {
						exports: ['Server']
					}
				});
			},
			emulate() {
				return {
					platform({ config, prerender }) {
						return { config, prerender };
					}
				};
			},
			supports: {
				read: () => true,
				instrumentation: () => true
			}
		},

		experimental: {
			remoteFunctions: true,
			tracing: {
				server: true
			},
			instrumentation: {
				server: true
			}
		},

		csrf: {
			checkOrigin: true,
			trustedOrigins: ['https://trusted.example.com', 'https://payment-gateway.test']
		},

		prerender: {
			entries: [
				'*',
				'/routing/prerendered/trailing-slash/always/',
				'/routing/prerendered/trailing-slash/never',
				'/routing/prerendered/trailing-slash/ignore'
			],
			handleHttpError: ({ path, message }) => {
				if (path.includes('/reroute/async')) {
					throw new Error('shouldnt error on ' + path);
				}

				console.warn(message);
			}
		},
		serviceWorker: {
			register: true,
			options: {
				updateViaCache: 'imports'
			}
		},

		version: {
			name: 'TEST_VERSION'
		},

		router: {
			resolution: /** @type {'client' | 'server'} */ (process.env.ROUTER_RESOLUTION) || 'client'
		}
	},

	compilerOptions: {
		experimental: { async: process.env.SVELTE_ASYNC === 'true' }
	}
};

export default config;
