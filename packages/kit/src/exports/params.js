import { normalize_param_definition } from '../utils/params.js';

/**
 * Define [parameter matchers](https://svelte.dev/docs/kit/advanced-routing#Matching) for your app.
 *
 * @example
 * ```js
 * import { defineParams } from '@sveltejs/kit';
 * import * as v from 'valibot';
 *
 * export const params = defineParams({
 * 	foo: (param) => {
 * 		if (param !== 'bar') throw new Error('Invalid param');
 * 		return param;
 * 	},
 * 	bar: v.string()
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
