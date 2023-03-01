const param_pattern = /^(\[)?(\.\.\.)?(\w+)(?:=(\w+))?(\])?$/;

/**
 * Creates the regex pattern, extracts parameter names, and generates types for a route
 * @param {string} id
 */
export function parse_route_id(id) {
	/** @type {import('types').RouteParam[]} */
	const params = [];

	const pattern =
		id === '/'
			? /^\/$/
			: new RegExp(
					`^${get_route_segments(id)
						.map((segment) => {
							// special case — /[...rest]/ could contain zero segments
							const rest_match = /^\[\.\.\.(\w+)(?:=(\w+))?\]$/.exec(segment);
							if (rest_match) {
								params.push({
									name: rest_match[1],
									matcher: rest_match[2],
									optional: false,
									rest: true,
									chained: true
								});
								return '(?:/(.*))?';
							}
							// special case — /[[optional]]/ could contain zero segments
							const optional_match = /^\[\[(\w+)(?:=(\w+))?\]\]$/.exec(segment);
							if (optional_match) {
								params.push({
									name: optional_match[1],
									matcher: optional_match[2],
									optional: true,
									rest: false,
									chained: true
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
										if (content.startsWith('x+')) {
											return escape(String.fromCharCode(parseInt(content.slice(2), 16)));
										}

										if (content.startsWith('u+')) {
											return escape(
												String.fromCharCode(
													...content
														.slice(2)
														.split('-')
														.map((code) => parseInt(code, 16))
												)
											);
										}

										const match = param_pattern.exec(content);
										if (!match) {
											throw new Error(
												`Invalid param: ${content}. Params and matcher names can only have underscores and alphanumeric characters.`
											);
										}

										const [, is_optional, is_rest, name, matcher] = match;
										// It's assumed that the following invalid route id cases are already checked
										// - unbalanced brackets
										// - optional param following rest param

										params.push({
											name,
											matcher,
											optional: !!is_optional,
											rest: !!is_rest,
											chained: is_rest ? i === 1 && parts[0] === '' : false
										});
										return is_rest ? '(.*?)' : is_optional ? '([^/]*)?' : '([^/]+?)';
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
 * Returns `false` for `(group)` segments
 * @param {string} segment
 */
function affects_path(segment) {
	return !/^\([^)]+\)$/.test(segment);
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
 * @param {RegExpMatchArray} match
 * @param {import('types').RouteParam[]} params
 * @param {Record<string, import('types').ParamMatcher>} matchers
 */
export function exec(match, params, matchers) {
	/** @type {Record<string, string>} */
	const result = {};

	const values = match.slice(1);

	let buffered = 0;

	for (let i = 0; i < params.length; i += 1) {
		const param = params[i];
		const value = values[i - buffered];

		// in the `[[a=b]]/.../[...rest]` case, if one or more optional parameters
		// weren't matched, roll the skipped values into the rest
		if (param.chained && param.rest && buffered) {
			result[param.name] = values
				.slice(i - buffered, i + 1)
				.filter((s) => s)
				.join('/');

			buffered = 0;
			continue;
		}

		// if `value` is undefined, it means this is an optional or rest parameter
		if (value === undefined) {
			if (param.rest) result[param.name] = '';
			continue;
		}

		if (!param.matcher || matchers[param.matcher](value)) {
			result[param.name] = value;

			// Now that the params match, reset the buffer if the next param isn't the [...rest]
			// and the next value is defined, otherwise the buffer will cause us to skip values
			const next_param = params[i + 1];
			const next_value = values[i + 1];
			if (next_param && !next_param.rest && next_value) {
				buffered = 0;
			}
			continue;
		}

		// in the `/[[a=b]]/...` case, if the value didn't satisfy the matcher,
		// keep track of the number of skipped optional parameters and continue
		if (param.optional && param.chained) {
			buffered++;
			continue;
		}

		// otherwise, if the matcher returns `false`, the route did not match
		return;
	}

	if (buffered) return;
	return result;
}

/** @param {string} str */
function escape(str) {
	return (
		str
			.normalize()
			// escape [ and ] before escaping other characters, since they are used in the replacements
			.replace(/[[\]]/g, '\\$&')
			// replace %, /, ? and # with their encoded versions because decode_pathname leaves them untouched
			.replace(/%/g, '%25')
			.replace(/\//g, '%2[Ff]')
			.replace(/\?/g, '%3[Ff]')
			.replace(/#/g, '%23')
			// escape characters that have special meaning in regex
			.replace(/[.*+?^${}()|\\]/g, '\\$&')
	);
}
