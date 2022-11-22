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

	let m = 1;
	let prev = '';

	for (const param of params) {
		let value = (param.chained && prev) || match[m++];

		if (param.rest && param.chained && prev && match[m]) {
			value += `/${match[m++]}`;
		}

		if (!value) {
			if (param.rest) result[param.name] = '';
			continue;
		}

		if (param.matcher) {
			const matcher = matchers[param.matcher];
			if (!matcher(value)) {
				if (param.optional && param.chained) {
					prev = value;
					continue;
				}
				return;
			}
		}

		result[param.name] = value;
		prev = '';
	}

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
