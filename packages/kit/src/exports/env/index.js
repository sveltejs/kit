/** @import { EnvVarConfig } from '@sveltejs/kit' */

// tsc otherwise reports EnvVarConfig as unused since it's only referenced in a @template bound
export {};

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
