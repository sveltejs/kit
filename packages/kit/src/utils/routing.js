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
		id === ''
			? /^\/$/
			: new RegExp(
					`^${id
						.split(/(?:\/|$)/)
						.filter(affects_path)
						.map((segment, i, segments) => {
							const decoded_segment = decodeURIComponent(segment);
							// special case — /[...rest]/ could contain zero segments
							const match = /^\[\.\.\.(\w+)(?:=(\w+))?\]$/.exec(decoded_segment);
							if (match) {
								names.push(match[1]);
								types.push(match[2]);
								return '(?:/(.*))?';
							}

							const is_last = i === segments.length - 1;

							if (!decoded_segment) {
								return;
							}

							let is_optional = false;
							const parts = decoded_segment.split(/\[(.+?)\](?!\])/);
							const dynamic_only = parts.length === 3 && !parts[0] && !parts[2];
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

										is_optional = is_optional || !!optional;
										names.push(name);
										types.push(type);
										return rest
											? '(.*?)'
											: optional
											? dynamic_only
												? '(?:/([^/]+))?'
												: '([^/]*)?'
											: '([^/]+?)';
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

							if (is_optional && dynamic_only) {
								// optional param makes up the whole segment, the slash is part of the regex
								return result;
							} else {
								return '/' + result;
							}
						})
						.join('')}${add_trailing_slash ? '/?' : ''}$`
			  );

	return { pattern, names, types };
}

/**
 * Returns `false` for `(group)` segments
 * @param {string} segment
 */
export function affects_path(segment) {
	return !/^\([^)]+\)$/.test(segment);
}

/**
 * @param {RegExpMatchArray} match
 * @param {string[]} names
 * @param {string[]} types
 * @param {Record<string, import('types').ParamMatcher>} matchers
 */
export function exec(match, names, types, matchers) {
	/** @type {Record<string, string>} */
	const params = {};

	for (let i = 0; i < names.length; i += 1) {
		const name = names[i];
		const type = types[i];
		let value = match[i + 1] || '';

		if (type) {
			const matcher = matchers[type];
			if (!matcher) throw new Error(`Missing "${type}" param matcher`); // TODO do this ahead of time?

			if (!matcher(value)) return;
		}

		params[name] = value;
	}

	return params;
}
