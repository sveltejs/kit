/** @import { ParamMatcher, ParamValue } from '@sveltejs/kit/params' */
import * as e from '../messages/shared-errors.js';
import { escape_for_regexp } from './regex.js';

const param_pattern = /^(\[)?(\.\.\.)?([\w-]+)(?:=([\w-]+))?(\])?$/;

const root_group_pattern = /^\/\((?:[^)]+)\)$/;

const escape_sequence_pattern = /\[([ux])\+([^\]]+)\]/;

/**
 * Decodes the codepoints of an `[x+nn]` or `[u+nnnn]` escape sequence
 * @param {string} code the sequence without its `[x+`/`[u+` prefix or `]` suffix
 */
export function decode_escape_sequence(code) {
	return String.fromCodePoint(...code.split('-').map((codepoint) => parseInt(codepoint, 16)));
}

/**
 * Encodes the characters that `decode_pathname` leaves untouched, so that a decoded
 * escape sequence still matches the pattern `parse_route_id` builds for it
 * @param {string} str
 */
export function encode_pathname_chars(str) {
	return str.replace(
		/[%/?#]/g,
		(char) => '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
	);
}

/**
 * Creates the regex pattern, extracts parameter names, and generates types for a route
 * @param {string} id
 */
export function parse_route_id(id) {
	/** @type {import('types').RouteParam[]} */
	const params = [];

	const pattern =
		id === '/' || root_group_pattern.test(id)
			? /^\/$/
			: new RegExp(
					`^${get_route_segments(id)
						.map((segment, i, segments) => {
							// Values can only shift into a following parameter at the start of a
							// segment. An inline optional (e.g. [[slug]].json) cannot receive a whole segment.
							const next = segments[i + 1] ?? '';
							const chained =
								/^\[(?:\.\.\.)?[\w-]+(?:=[\w-]+)?\]/.test(next) ||
								(next.startsWith('[[') && param_pattern.test(next.slice(1, -1)));

							// special case — /[...rest]/ could contain zero segments
							const rest_match = /^\[\.\.\.([\w-]+)(?:=([\w-]+))?\]$/.exec(segment);
							if (rest_match) {
								params.push({
									name: rest_match[1],
									matcher: rest_match[2],
									optional: false,
									rest: true,
									chained
								});
								return '(?:/([^]*))?';
							}
							// special case — /[[optional]]/ could contain zero segments
							const optional_match = /^\[\[([\w-]+)(?:=([\w-]+))?\]\]$/.exec(segment);
							if (optional_match) {
								params.push({
									name: optional_match[1],
									matcher: optional_match[2],
									optional: true,
									rest: false,
									chained
								});
								return '(?:/([^/]+))?';
							}

							if (!segment) {
								return;
							}

							const parts = segment.split(/\[(.+?)\](?!\])/);
							const result = parts
								.map((content, i) => {
									if (i % 2) {
										if (content.startsWith('x+') || content.startsWith('u+')) {
											return escape(decode_escape_sequence(content.slice(2)));
										}

										// We know the match cannot be null because manifest generation checks
										// each route ID with `validate_route_id_params` first
										const match = /** @type {RegExpExecArray} */ (param_pattern.exec(content));

										const [, is_optional, is_rest, name, matcher] = match;
										// It's assumed that the following invalid route id cases are already checked
										// - unbalanced brackets
										// - optional param following rest param

										params.push({
											name,
											matcher,
											optional: !!is_optional,
											rest: !!is_rest,
											chained: parts.length === 3 && parts[0] === '' && parts[2] === '' && chained
										});
										return is_rest ? '([^]*?)' : is_optional ? '([^/]*)?' : '([^/]+?)';
									}

									return escape(content);
								})
								.join('');

							return '/' + result;
						})
						.join('')}/?$`
				);

	return { pattern, params };
}

/**
 * Returns the first param in a route ID whose name or matcher contains characters other than
 * underscores, hyphens and alphanumeric characters, mirroring the segments `parse_route_id` parses
 * @param {string} id
 * @returns {string | undefined}
 */
export function validate_route_id_params(id) {
	if (id === '/' || root_group_pattern.test(id)) return;

	for (const segment of get_route_segments(id)) {
		if (/^\[\.\.\.([\w-]+)(?:=([\w-]+))?\]$/.test(segment)) continue;
		if (/^\[\[([\w-]+)(?:=([\w-]+))?\]\]$/.test(segment)) continue;
		if (!segment) continue;

		const parts = segment.split(/\[(.+?)\](?!\])/);
		for (let i = 1; i < parts.length; i += 2) {
			const content = parts[i];
			if (content.startsWith('x+') || content.startsWith('u+')) continue;
			if (!param_pattern.test(content)) return content;
		}
	}
}

/**
 * Returns `false` for `(group)` segments
 * @param {string} segment
 */
function affects_path(segment) {
	return segment !== '' && !/^\([^)]+\)$/.test(segment);
}

/**
 * Splits a route id into its segments, removing segments that
 * don't affect the path (i.e. groups). The root route is represented by `/`
 * and will be returned as `['']`.
 * @param {string} route
 * @returns string[]
 */
export function get_route_segments(route) {
	return route.slice(1).split('/').filter(affects_path);
}

/**
 * @param {ParamMatcher} matcher
 * @param {string} value
 * @returns {{ success: true, value: any } | { success: false }}
 */
function run_matcher(matcher, value) {
	const result = matcher['~standard'].validate(value);

	if (result instanceof Promise) {
		e.param_matcher_async();
	}

	if (result.issues) {
		return { success: false };
	}

	const parsed = result.value;

	if (
		typeof parsed !== 'string' &&
		typeof parsed !== 'number' &&
		typeof parsed !== 'boolean' &&
		typeof parsed !== 'bigint'
	) {
		e.param_matcher_result_invalid();
	}

	return { success: true, value: parsed };
}

/**
 * @param {RegExpMatchArray} match
 * @param {import('types').RouteParam[]} params
 * @param {Record<string, ParamMatcher>} matchers
 */
export function exec(match, params, matchers) {
	/** @type {Record<string, any>} */
	const result = {};

	const values = match.slice(1);

	for (let i = 0; i < params.length; i += 1) {
		const param = params[i];
		let value = values[i];

		// if `value` is undefined, it means this is an optional or rest parameter
		if (value === undefined) {
			if (param.rest) {
				// We need to allow the matcher to run so that it can decide if this optional rest param should be allowed to match
				value = '';
			} else {
				continue;
			}
		}

		const decoded = decodeURIComponent(value);

		if (param.matcher) {
			const outcome = run_matcher(matchers[param.matcher], decoded);

			if (!outcome.success) {
				if (param.optional) {
					// Find somewhere for this value to go without crossing any static text.
					// Every intervening capture must be preserved, including required params.
					let j = i;
					let found = false;
					while (params[j].chained) {
						j += 1;

						if (params[j].rest) {
							values[j] = [values[j - 1], values[j]]
								.filter((value) => value !== undefined)
								.join('/');
							found = true;
							break;
						}

						if (values[j] === undefined) {
							values[j] = values[j - 1];
							found = true;
							break;
						}
					}

					// No vacancy or rest param was found before the end of this chain.
					if (!found) return;

					while (--j > i) {
						values[j] = values[j - 1];
					}
					continue;
				}

				// otherwise, if the matcher returns `false`, the route did not match
				return;
			}

			result[param.name] = outcome.value;
		} else {
			result[param.name] = decoded;
		}
	}

	return result;
}

/**
 * `decode_pathname` leaves these characters untouched, so routes have to match their encoded forms
 * @type {Record<string, string>}
 */
const encoded = {
	'%': '%25',
	'/': '%2[Ff]',
	'?': '%3[Ff]',
	'#': '%23'
};

/** @param {string} str */
function escape(str) {
	// the replacements in `encoded` are regex source themselves, so they must not be escaped again
	return str
		.normalize()
		.split(/([%/?#])/)
		.map((part, i) => (i % 2 ? encoded[part] : escape_for_regexp(part)))
		.join('');
}

const basic_param_pattern = /\[(\[)?(\.\.\.)?([\w-]+?)(?:=([\w-]+))?\]\]?/g;

// escape sequences are expanded in the same pass as the params, so that a param
// value containing `[x+2f]` is not itself expanded
export const segment_pattern = new RegExp(
	`${escape_sequence_pattern.source}|${basic_param_pattern.source}`,
	'g'
);

/**
 * Populate a route ID with params to resolve a pathname.
 * @example
 * ```js
 * resolveRoute(
 *   `/blog/[slug]/[...somethingElse]`,
 *   {
 *     slug: 'hello-world',
 *     somethingElse: 'something/else'
 *   }
 * ); // `/blog/hello-world/something/else`
 * ```
 * @param {string} id
 * @param {Record<string, ParamValue | undefined>} params
 * @returns {string}
 */
export function resolve_route(id, params) {
	const segments = get_route_segments(id);
	const has_id_trailing_slash = id != '/' && id.endsWith('/');

	return (
		'/' +
		segments
			.map((segment) =>
				segment.replace(segment_pattern, (_, escape_type, escape_code, optional, rest, name) => {
					if (escape_type) return encode_pathname_chars(decode_escape_sequence(escape_code));

					const value = params[name];

					if (value === undefined || value === '') {
						if (optional) return '';
						if (rest && value !== undefined) return '';
						e.route_param_missing({ name, id });
					}

					if (typeof value === 'string') {
						if (value.startsWith('/') || value.endsWith('/')) {
							e.route_param_slash({ name, id });
						}

						return value;
					}

					if (
						typeof value === 'number' ||
						typeof value === 'boolean' ||
						typeof value === 'bigint'
					) {
						return String(value);
					}

					e.route_param_value_invalid({ name, id });
				})
			)
			.filter(Boolean)
			.join('/') +
		(has_id_trailing_slash ? '/' : '')
	);
}

/**
 * @param {import('types').SSRNode} node
 * @returns {boolean}
 */
export function has_server_load(node) {
	return node.server?.load !== undefined || node.server?.trailingSlash !== undefined;
}

/**
 * Find the first route that matches the given path
 * @template {{pattern: RegExp, params: import('types').RouteParam[]}} Route
 * @param {string} path - The decoded pathname to match
 * @param {Route[]} routes
 * @param {Record<string, ParamMatcher>} matchers
 * @returns {{ route: Route, params: Record<string, any> } | null}
 */
export function find_route(path, routes, matchers) {
	for (const route of routes) {
		const match = route.pattern.exec(path);
		if (!match) continue;

		const matched = exec(match, route.params, matchers);
		if (matched) {
			return {
				route,
				params: matched
			};
		}
	}
	return null;
}
