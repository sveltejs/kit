/**
 * @param {import("types").CSRComponentLoader[]} components
 * @param {Record<string, [number[], number[], 1?]>} dictionary
 * @param {Record<string, (param: string) => boolean>} validators
 */
export function parse(components, dictionary, validators) {
	const routes = Object.entries(dictionary).map(([key, [a, b, has_shadow]]) => {
		/** @type {string[]} */
		const names = [];

		/** @type {string[]} */
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
			/** @param {string} path */
			exec: (path) => {
				const match = pattern.exec(path);
				if (!match) return;

				/** @type {Record<string, string>} */
				const params = {};

				for (let i = 0; i < names.length; i += 1) {
					const name = names[i];
					const type = types[i];
					const value = match[i + 1] || '';

					if (type) {
						const validator = validators[type];
						if (!validator) throw new Error(`Missing "${type}" param validator`); // TODO do this ahead of time?

						if (!validator(value)) return;
					}

					params[name] = decodeURIComponent(value);
				}

				return params;
			},
			a: a.map((n) => components[n]),
			b: b.map((n) => components[n]),
			has_shadow: !!has_shadow
		};
	});

	return routes;
}
