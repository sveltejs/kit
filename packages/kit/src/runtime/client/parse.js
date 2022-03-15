import { exec, parse_route_key } from '../../utils/routing.js';

/**
 * @param {import("types").CSRComponentLoader[]} components
 * @param {Record<string, [number[], number[], 1?]>} dictionary
 * @param {Record<string, (param: string) => boolean>} validators
 */
export function parse(components, dictionary, validators) {
	const routes = Object.entries(dictionary).map(([key, [a, b, has_shadow]]) => {
		const { pattern, names, types } = parse_route_key(key);

		return {
			key,
			/** @param {string} path */
			exec: (path) => {
				const match = pattern.exec(path);
				if (match) return exec(match, names, types, validators);
			},
			a: a.map((n) => components[n]),
			b: b.map((n) => components[n]),
			has_shadow: !!has_shadow
		};
	});

	return routes;
}
