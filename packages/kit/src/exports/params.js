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
 * 		if (param !== 'bar') return;
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

/**
 * @param {import('@sveltejs/kit').ParamDefinition} definition
 * @returns {import('@sveltejs/kit').ParamMatcher}
 */
export function normalize_param_definition(definition) {
	if (typeof definition === 'function') {
		return /** @type {import('@sveltejs/kit').ParamMatcher} */ (
			/** @type {unknown} */ ({
				'~standard': {
					validate(/** @type {unknown} */ value) {
						const result = definition(/** @type {string} */ (value));

						if (result === undefined) {
							return { issues: [{ message: 'Invalid param' }] };
						}

						if (
							typeof result !== 'string' &&
							typeof result !== 'number' &&
							typeof result !== 'boolean' &&
							typeof result !== 'bigint'
						) {
							throw new Error('Param matcher must return a string, number, boolean, or bigint');
						}

						return { value: result };
					}
				}
			})
		);
	}

	if (definition && typeof definition === 'object' && '~standard' in definition) {
		return definition;
	}

	throw new Error('Invalid param definition');
}
