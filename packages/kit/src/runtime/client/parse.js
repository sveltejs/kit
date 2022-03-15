/**
 * @param {import("types").CSRComponentLoader[]} components
 * @param {Record<string, [number[], number[], 1?]>} dictionary
 */
export function parse(components, dictionary) {
	const routes = Object.entries(dictionary).map(([key, [a, b, has_shadow]]) => {
		/** @type {string[]} */
		const names = [];
		const types = [];

		const pattern =
			key === ''
				? /^\/$/
				: new RegExp(
						`^${decodeURIComponent(key)
							.split('/')
							.map((segment) => {
								// special case — /[...rest]/ could contain zero segments
								const match = /^\[\.\.\.(\w+)(?:=\w+)?\]$/.exec(segment);
								if (match) {
									names.push(match[1]);
									types.push(match[2]);
									return '(?:/(.*))?';
								}

								return (
									'/' +
									segment.replace(/\[(\.\.\.)?(\w+)(?:=(\w+))?\]/g, (m, rest, name, type) => {
										names.push(name);
										types.push(type);
										return rest ? '(.*?)' : '([^/]+?)';
									})
								);
							})
							.join('')}/?$`
				  );

		return {
			key,
			pattern,
			a: a.map((n) => components[n]),
			b: b.map((n) => components[n]),
			/** @param {RegExpMatchArray} match */
			get_params: (match) => {
				/** @type {Record<string, string>} */
				const params = {};
				names.forEach((name, i) => {
					params[name] = decodeURIComponent(match[i + 1] || '');
				});
				return params;
			},
			has_shadow: !!has_shadow
		};
	});

	return routes;
}
