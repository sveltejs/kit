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
		}
	}
};

export default config;
