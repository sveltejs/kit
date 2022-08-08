import { exec, parse_route_id } from '../../utils/routing.js';

/**
 * @param {import('types').CSRPageNodeLoader[]} nodes
 * @param {Record<string, [number[], number[], number]>} dictionary
 * @param {Record<string, (param: string) => boolean>} matchers
 * @returns {import('types').CSRRoute[]}
 */
export function parse(nodes, dictionary, matchers) {
	return Object.entries(dictionary).map(([id, [errors, layouts, page]]) => {
		const { pattern, names, types } = parse_route_id(id);

		return {
			id,
			/** @param {string} path */
			exec: (path) => {
				const match = pattern.exec(path);
				if (match) return exec(match, names, types, matchers);
			},
			errors: errors.map((n) => nodes[n]),
			layouts: layouts.map((n) => nodes[n]),
			page: nodes[page]
		};
	});
}
