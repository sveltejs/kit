import { affects_path } from '../../../utils/routing.js';

/**
 * @typedef {{
 *   content: string;
 *   dynamic: boolean;
 *   optional: boolean;
 *   rest: boolean;
 *   matcher: string | null;
 * }} Part
 */

/**
 * @typedef {Part[]} Segment
 */

/** @param {Map<string, import('types').RouteData>} route_map */
export function sort_routes(route_map) {
	/** @type {Map<string, string[]>} */
	const segment_map = new Map();

	/** @param {string} segment */
	function split_segment(segment) {
		if (!segment_map.has(segment)) {
			segment_map.set(segment, split(segment));
		}

		return segment_map.get(segment);
	}

	return Array.from(route_map.values()).sort((route_a, route_b) => {
		try {
			const segments_a = split_route_id(route_a.id).map(split_segment);
			const segments_b = split_route_id(route_b.id).map(split_segment);

			for (let i = 0; i < Math.max(segments_a.length, segments_b.length); i += 1) {
				const segment_a = segments_a[i];
				const segment_b = segments_b[i];

				// shallower path outranks deeper path
				if (!segment_a) return -1;
				if (!segment_b) return +1;

				// compare two segments
				for (let j = 0; j < Math.max(segment_a.length, segment_b.length); j += 1) {
					const a = segment_a[j];
					const b = segment_b[j];

					// first part of each segment is always static
					// (though it may be the empty string), then
					// it alternates between dynamic and static
					// (i.e. [foo][bar] is disallowed)
					const dynamic = j % 2 === 1;

					if (dynamic) {
						if (a === undefined) return -1;
						if (b === undefined) return +1;

						// TODO parse in the first place
						const parsed_a = parse(a);
						const parsed_b = parse(b);

						// part with matcher outranks one without
						if (parsed_a.matched !== parsed_b.matched) {
							return parsed_a.matched ? -1 : +1;
						}

						if (parsed_a.type !== parsed_b.type) {
							// [required] outranks [[optional]] or [...rest]
							if (parsed_a.type === 'required') return -1;
							if (parsed_b.type === 'required') return +1;

							// [[optional]] outranks [...rest]
							if (parsed_a.type === 'optional') return -1;
							if (parsed_b.type === 'optional') return +1;
						}
					} else if (a !== b) {
						return sort_static(a, b);
					}
				}
			}

			return route_a.id < route_b.id ? -1 : +1; // TODO error on conflicts?
		} finally {
			console.groupEnd();
		}
	});
}

/** @param {string} id */
function split_route_id(id) {
	return (
		id
			// remove all [[optional]]/[...rest] parts unless they're at the very end
			.replace(/\[(\[[^\]]+\]|\.\.\.[^\]]+)\](?!$)/g, '')
			.split('/')
			.filter((segment) => segment !== '' && affects_path(segment))
	);
}

/** @param {string} id */
function split(id) {
	const parts = [];

	let i = 0;
	while (i <= id.length) {
		const start = id.indexOf('[', i);
		if (start === -1) {
			parts.push(id.slice(i));
			break;
		}

		parts.push(id.slice(i, start));
		const delimiter = id[start + 1] === '[' ? ']]' : ']';
		const end = id.indexOf(delimiter, start);

		if (end === -1) {
			throw new Error(`Invalid route ID ${id}`);
		}

		parts.push(id.slice(start, (i = end + delimiter.length)));
	}

	return parts;
}

/**
 * Sort two strings lexicographically, except `foobar` outranks `foo`
 * @param {string} a
 * @param {string} b
 */
function sort_static(a, b) {
	if (a === b) return 0;

	for (let i = 0; true; i += 1) {
		const char_a = a[i];
		const char_b = b[i];

		if (char_a !== char_b) {
			if (char_a === undefined) return +1;
			if (char_b === undefined) return -1;
			return char_a < char_b ? -1 : +1;
		}
	}
}

/** @param {string} part */
function parse(part) {
	return {
		type: part.startsWith('[[') ? 'optional' : part.startsWith('[...') ? 'rest' : 'required',
		matched: part.includes('=')
	};
}
