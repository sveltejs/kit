import { loadEnv } from 'vite';
import { filter_env } from '../../utils/env.js';

/**
 * Load environment variables from process.env and .env files
 * @param {{ dir: string; publicPrefix: string; privatePrefix: string }} env_config
 * @param {string} mode
 * @returns {import('./types.js').Env}
 */
export function get_env(env_config, mode) {
	const { publicPrefix: public_prefix, privatePrefix: private_prefix } = env_config;
	const env = loadEnv(mode, env_config.dir, '');

	return {
		public: filter_env(env, public_prefix, private_prefix),
		private: filter_env(env, private_prefix, public_prefix)
	};
}
