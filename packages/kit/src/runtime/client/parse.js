import { exec, parse_route_id } from '../../utils/routing.js';

/**
 * @param {import('types').CSRComponentLoader[]} components
 * @param {Record<string, [number[], number[], 1?]>} dictionary
 * @param {Record<string, (param: string) => boolean>} matchers
 * @returns {import('types').CSRRoute[]}
 */
export function parse(components, dictionary, matchers) {
	const routes = Object.entries(dictionary).map(([id, [a, b, has_shadow]]) => {
		const { pattern, names, types } = parse_route_id(id);

		return {
			id,
			/** @param {string} path */
			exec: (path) => {
				const match = pattern.exec(path);
				if (match) return exec(match, names, types, matchers);
			},
			a: a.map((n) => components[n]),
			b: b.map((n) => components[n]),
			has_shadow: !!has_shadow
		};
	});

	return routes;
}
