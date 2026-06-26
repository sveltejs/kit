import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @param {import('types').RouteData[]} routes
 * @returns {Set<string>}
 */
export function collect_matcher_names(routes) {
	/** @type {Set<string>} */
	const names = new Set();

	for (const route of routes) {
		for (const param of route.params) {
			if (param.matcher) names.add(param.matcher);
		}
	}

	return names;
}

/**
 * @param {Record<string, unknown>} params
 * @param {Set<string>} names
 * @param {string} [file]
 */
export function validate_param_matchers(params, names, file) {
	for (const name of names) {
		if (!(name in params)) {
			throw new Error(`No matcher found for parameter '${name}'${file ? ` in ${file}` : ''}`);
		}
	}
}

/**
 * @param {{
 *   routes: import('types').RouteData[];
 *   params_path: string | null;
 *   root: string;
 *   load?: (file: string) => Promise<Record<string, unknown>>;
 * }} opts
 * @returns {Promise<Record<string, import('@sveltejs/kit').ParamMatcher> | null>}
 */
export async function load_and_validate_params({ routes, params_path, root, load }) {
	const names = collect_matcher_names(routes);

	if (names.size === 0) return null;

	if (!params_path) {
		throw new Error(`No matcher found for parameter '${names.values().next().value}'`);
	}

	const file = path.resolve(root, params_path);
	const module = load ? await load(file) : await import(pathToFileURL(file).href);

	if (!module.params || typeof module.params !== 'object') {
		throw new Error(`${params_path} does not export \`params\` from \`defineParams\``);
	}

	validate_param_matchers(
		/** @type {Record<string, unknown>} */ (module.params),
		names,
		params_path
	);

	return /** @type {Record<string, import('@sveltejs/kit').ParamMatcher>} */ (module.params);
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
						try {
							return { value: definition(/** @type {string} */ (value)) };
						} catch (error) {
							return {
								issues: [{ message: error instanceof Error ? error.message : 'Invalid param' }]
							};
						}
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
