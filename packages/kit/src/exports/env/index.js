/** @import { EnvVarConfig } from '@sveltejs/kit' */

/**
 * Utility for defining [environment variables](https://svelte.dev/docs/kit/environment-variables),
 * which are made available via `$app/env/public` and `$app/env/private`.
 * @template {Record<string, EnvVarConfig<any>>} T
 * @param {T} variables
 * @returns {T}
 */
export function defineEnvVars(variables) {
	return variables;
}
