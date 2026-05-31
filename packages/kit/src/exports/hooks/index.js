/** @import { EnvVarConfig } from '@sveltejs/kit' */

export { sequence } from './sequence.js';

/**
 * Utility for defining environment variables, which are made available via
 * `$app/env/public` and `$app/env/private`.
 * @param {Record<string, EnvVarConfig>} variables
 * @returns {Record<string, EnvVarConfig>}
 */
export function defineEnvVars(variables) {
	return variables;
}
