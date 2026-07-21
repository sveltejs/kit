/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { DefinedEnvVars, EnvVarConfig } from '@sveltejs/kit' */

/**
 * Utility for defining [environment variables](https://svelte.dev/docs/kit/environment-variables),
 * which are made available via `$app/env/public` and `$app/env/private`.
 *
 * @example
 * ```js
 * import { defineEnvVars } from '@sveltejs/kit/env';
 * import * as v from 'valibot';
 *
 * export const variables = defineEnvVars({
 * 	API_URL: {
 * 		schema: v.pipe(v.string(), v.url())
 * 	},
 * 	PORT: {
 * 		schema: (value) => {
 * 			if (value === undefined) return 3000;
 * 			const port = Number(value);
 * 			if (!Number.isInteger(port)) throw new Error('PORT must be an integer');
 * 			return port;
 * 		}
 * 	}
 * });
 * ```
 *
 * @template {Record<string, EnvVarConfig<any>>} T
 * @param {T} variables
 * @returns {DefinedEnvVars<T>}
 */
export function defineEnvVars(variables) {
	/** @type {Record<string, EnvVarConfig<any>>} */
	const normalized = {};

	for (const [name, config] of Object.entries(variables)) {
		// standard schemas can be callable (e.g. ArkType), so a function is only a validator if it isn't one
		normalized[name] =
			typeof config.schema === 'function' && !('~standard' in config.schema)
				? { ...config, schema: normalize_env_schema(config.schema) }
				: config;
	}

	return /** @type {DefinedEnvVars<T>} */ (normalized);
}

/**
 * @param {(value: string | undefined) => any} fn
 * @returns {StandardSchemaV1<string | undefined, any>}
 */
function normalize_env_schema(fn) {
	return /** @type {StandardSchemaV1<string | undefined, any>} */ (
		/** @type {unknown} */ ({
			'~standard': {
				validate(/** @type {unknown} */ value) {
					let result;

					try {
						result = fn(/** @type {string | undefined} */ (value));
					} catch (error) {
						return {
							issues: [
								{
									message: error instanceof Error ? error.message || 'Invalid value' : String(error)
								}
							]
						};
					}

					if (result instanceof Promise) return result; // will be rejected upstream

					return { value: result };
				}
			}
		})
	);
}
