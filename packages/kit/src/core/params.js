/** @import { ParamMatcher } from '@sveltejs/kit/params' */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as e from '../messages/build-errors.js';

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
		if (!Object.hasOwn(params, name)) {
			e.param_matcher_missing({ name, file: file || undefined });
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
 * @returns {Promise<Record<string, ParamMatcher> | null>}
 */
export async function load_and_validate_params({ routes, params_path, root, load }) {
	const names = collect_matcher_names(routes);

	if (names.size === 0) return null;

	if (!params_path) {
		e.param_matcher_missing({ name: /** @type {string} */ (names.values().next().value) });
	}

	const file = path.resolve(root, params_path);
	const module = load ? await load(file) : await import(pathToFileURL(file).href);

	if (!module.params || typeof module.params !== 'object') {
		e.params_export_missing({ file: params_path });
	}

	validate_param_matchers(
		/** @type {Record<string, unknown>} */ (module.params),
		names,
		params_path
	);

	return /** @type {Record<string, ParamMatcher>} */ (module.params);
}
