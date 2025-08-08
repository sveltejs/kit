import process from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: {
			name: 'test-adapter',
			adapt() {},
			emulate() {
				return {
					platform({ config, prerender }) {
						return { config, prerender };
					}
				};
			},
			supports: {
				read: () => true
			}
		},

		experimental: {
			remoteFunctions: true
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

		version: {
			name: 'TEST_VERSION'
		},
		router: {
			resolution: /** @type {'client' | 'server'} */ (process.env.ROUTER_RESOLUTION) || 'client'
		},
		remoteFunctions: {
			allowedPaths: ['src/external-remotes/allowed']
		}
	}
};

export default config;
