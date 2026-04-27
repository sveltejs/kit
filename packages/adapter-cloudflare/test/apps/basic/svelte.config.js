import adapter from '../../../index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			vitePluginOptions: {
				config(user_config) {
					user_config.compatibility_date = '2026-04-22';
				}
			}
		})
	}
};

export default config;
