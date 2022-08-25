import { exec, parse_route_id } from '../../utils/routing.js';

/**
 * @param {import('types').CSRPageNodeLoader[]} nodes
 * @param {typeof import('__GENERATED__/client-manifest.js').dictionary} dictionary
 * @param {Record<string, (param: string) => boolean>} matchers
 * @returns {import('types').CSRRoute[]}
 */
export function parse(nodes, dictionary, matchers) {
	return Object.entries(dictionary).map(([id, [leaf, layouts, errors]]) => {
		const { pattern, names, types } = parse_route_id(id);

		// whether or not the route uses the server data is
		// encoded using the ones' complement, to save space
		const uses_server_data = leaf < 0;
		if (uses_server_data) leaf = ~leaf;

		const route = {
			id,
			/** @param {string} path */
			exec: (path) => {
				const match = pattern.exec(path);
				if (match) return exec(match, names, types, matchers);
			},
			errors: [1, ...(errors || [])].map((n) => nodes[n]),
			layouts: [0, ...(layouts || [])].map((n) => nodes[n]),
			leaf: nodes[leaf],
			uses_server_data
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
