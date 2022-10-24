const param_pattern = /^(\[)?(\.\.\.)?(\w+)(?:=(\w+))?(\])?$/;

/** @param {string} id */
export function parse_route_id(id) {
	/** @type {string[]} */
	const names = [];

	/** @type {string[]} */
	const types = [];

	// `/foo` should get an optional trailing slash, `/foo.json` should not
	// const add_trailing_slash = !/\.[a-z]+$/.test(key);
	let add_trailing_slash = true;

	const pattern =
		id === '/'
			? /^\/$/
			: new RegExp(
					`^${get_route_segments(id)
						.map((segment, i, segments) => {
							const decoded_segment = decodeURIComponent(segment);
							// special case — /[...rest]/ could contain zero segments
							const rest_match = /^\[\.\.\.(\w+)(?:=(\w+))?\]$/.exec(decoded_segment);
							if (rest_match) {
								names.push(rest_match[1]);
								types.push(rest_match[2]);
								return '(?:/(.*))?';
							}
							// special case — /[[optional]]/ could contain zero segments
							const optional_match = /^\[\[(\w+)(?:=(\w+))?\]\]$/.exec(decoded_segment);
							if (optional_match) {
								names.push(optional_match[1]);
								types.push(optional_match[2]);
								return '(?:/([^/]+))?';
							}

							const is_last = i === segments.length - 1;

							if (!decoded_segment) {
								return;
							}

							const parts = decoded_segment.split(/\[(.+?)\](?!\])/);
							const result = parts
								.map((content, i) => {
									if (i % 2) {
										const match = param_pattern.exec(content);
										if (!match) {
											throw new Error(
												`Invalid param: ${content}. Params and matcher names can only have underscores and alphanumeric characters.`
											);
										}

										const [, optional, rest, name, type] = match;
										// It's assumed that the following invalid route id cases are already checked
										// - unbalanced brackets
										// - optional param following rest param

										names.push(name);
										types.push(type);
										return rest ? '(.*?)' : optional ? '([^/]*)?' : '([^/]+?)';
									}

									if (is_last && content.includes('.')) add_trailing_slash = false;

									return (
										content // allow users to specify characters on the file system in an encoded manner
											.normalize()
											// We use [ and ] to denote parameters, so users must encode these on the file
											// system to match against them. We don't decode all characters since others
											// can already be epressed and so that '%' can be easily used directly in filenames
											.replace(/%5[Bb]/g, '[')
											.replace(/%5[Dd]/g, ']')
											// '#', '/', and '?' can only appear in URL path segments in an encoded manner.
											// They will not be touched by decodeURI so need to be encoded here, so
											// that we can match against them.
											// We skip '/' since you can't create a file with it on any OS
											.replace(/#/g, '%23')
											.replace(/\?/g, '%3F')
											// escape characters that have special meaning in regex
											.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
									); // TODO handle encoding
								})
								.join('');

							return '/' + result;
						})
						.join('')}${add_trailing_slash ? '/?' : ''}$`
			  );

	return { pattern, names, types };
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
 * @param {string} routeId
 * @param {string[]} names
 * @param {string[]} types
 * @param {Record<string, import('types').ParamMatcher>} matchers
 */
export function exec(match, routeId, names, types, matchers) {
	/** @type {Record<string, string>} */
	const params = {};
	let last_type_idx = -1;

	for (let i = 0; i < names.length; i += 1) {
		const name = names[i];
		const type = types[i];
		let value = match[i + 1] || '';

		if (type) {
			const matcher = matchers[type];
			if (!matcher) throw new Error(`Missing "${type}" param matcher`); // TODO do this ahead of time?

			last_type_idx = routeId.indexOf(`=${type}`, last_type_idx + 1);
			const is_empty_optional_param =
				!value &&
				// a param without a value can only be an optional or rest param
				routeId.lastIndexOf('[[', last_type_idx) > routeId.lastIndexOf('[...', last_type_idx);
			if (!is_empty_optional_param && !matcher(value)) return;
		}

		params[name] = value;
	}

	return params;
}
