/**
 * Define [parameter matchers](https://svelte.dev/docs/kit/advanced-routing#Matching) for your app.
 *
 * @example
 * ```js
 * import { defineParams } from '@sveltejs/kit';
 * import * as v from 'valibot';
 *
 * export const params = defineParams({
 * 	locale: (param) => {
 * 		if (param !== 'de' && param !== 'en') return;
 * 		return param;
 * 	},
 * 	number: v.pipe(v.string(), v.toNumber())
 * });
 * ```
 *
 * @template {Record<string, import('./public.js').ParamDefinition>} T
 * @param {T} definitions
 * @returns {import('./public.js').DefinedParams<T>}
 */
export function defineParams(definitions) {
	/** @type {Record<string, import('./public.js').ParamMatcher>} */
	const matchers = {};

	for (const [key, definition] of Object.entries(definitions)) {
		matchers[key] = normalize_param_definition(definition);
	}

	return /** @type {import('./public.js').DefinedParams<T>} */ (matchers);
}

/**
 * @param {import('@sveltejs/kit').ParamDefinition} definition
 * @returns {import('@sveltejs/kit').ParamMatcher}
 */
export function normalize_param_definition(definition) {
	// standard schemas can be callable (e.g. ArkType), so this must be checked before the function case
	if (
		definition &&
		(typeof definition === 'object' || typeof definition === 'function') &&
		'~standard' in definition
	) {
		return definition;
	}

	if (typeof definition === 'function') {
		return /** @type {import('@sveltejs/kit').ParamMatcher} */ (
			/** @type {unknown} */ ({
				'~standard': {
					validate(/** @type {unknown} */ value) {
						const result = definition(/** @type {string} */ (value));

						if (result === undefined) {
							return { issues: [{ message: 'Invalid param' }] };
						}

						if (/** @type {any} */ (result) instanceof Promise) return result; // will be validated and rejected upstream

						return { value: result };
					}
				}
			})
		);
	}

	throw new Error('Invalid param definition');
}
