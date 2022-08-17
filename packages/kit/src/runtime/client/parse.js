import { exec, parse_route_id } from '../../utils/routing.js';

/**
 * @param {import('types').CSRPageNodeLoader[]} nodes
 * @param {Record<string, [number[], number[], number, 1?]>} dictionary
 * @param {Record<string, (param: string) => boolean>} matchers
 * @returns {import('types').CSRRoute[]}
 */
export function parse(nodes, dictionary, matchers) {
	return Object.entries(dictionary).map(([id, [errors, layouts, leaf, uses_server_data]]) => {
		const { pattern, names, types } = parse_route_id(id);

		const route = {
			id,
			/** @param {string} path */
			exec: (path) => {
				const match = pattern.exec(path);
				if (match) return exec(match, names, types, matchers);
			},
			errors: errors.map((n) => nodes[n]),
			layouts: layouts.map((n) => nodes[n]),
			leaf: nodes[leaf],
			uses_server_data: !!uses_server_data
		};

		// bit of a hack, but ensures that layout/error node lists are the same
		// length, without which the wrong data will be applied if the route
		// manifest looks like `[[a, b], [c,], d]`
		route.errors.length = route.layouts.length = Math.max(
			route.errors.length,
			route.layouts.length
		);

		return route;
	});
}
