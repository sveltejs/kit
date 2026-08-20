/** @import { EnvVarConfig } from '@sveltejs/kit' */

export { sequence } from './sequence.js';

/**
 * Utility for defining [environment variables](https://svelte.dev/docs/kit/environment-variables),
 * which are made available via `$app/env/public` and `$app/env/private`.
 * @template {Record<string, EnvVarConfig<any>>} T
 * @param {T} variables
 * @returns {T}
 * @deprecated Import `defineEnvVars` from `@sveltejs/kit/env` instead
 */
export function defineEnvVars(variables) {
	console.warn(`\`defineEnvVars\` has moved — import it from \`@sveltejs/kit/env\` instead`);
	return variables;
}
