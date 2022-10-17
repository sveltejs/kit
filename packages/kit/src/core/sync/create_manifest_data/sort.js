import { affects_path } from '../../../utils/routing.js';

/**
 * @typedef {{
 *   type: 'static' | 'required' | 'optional' | 'rest';
 *   content: string;
 *   matched: boolean;
 * }} Part
 */

/**
 * @typedef {Part[]} Segment
 */

/** @param {import('types').RouteData[]} routes */
export function sort_routes(routes) {
	/** @type {Map<string, Part[]>} */
	const segment_cache = new Map();

	/** @param {string} segment */
	function get_parts(segment) {
		if (!segment_cache.has(segment)) {
			segment_cache.set(segment, split(segment));
		}

		return segment_cache.get(segment);
	}

	/** @param {string} id */
	function split_route_id(id) {
		return [
			id
				// remove all [[optional]]/[...rest] parts unless they're at the very end
				.replace(/\[(\[[^\]]+\]|\.\.\.[^\]]+)\](?!$)/g, ''),
			id
		].map((id) =>
			id
				.split('/')
				.filter((segment) => segment !== '' && affects_path(segment))
				.map(get_parts)
		);
	}

	/** @param {string} id */
	function split(id) {
		/** @type {Part[]} */
		const parts = [];

		let i = 0;
		while (i <= id.length) {
			const start = id.indexOf('[', i);
			if (start === -1) {
				parts.push({ type: 'static', content: id.slice(i), matched: false });
				break;
			}

			parts.push({ type: 'static', content: id.slice(i, start), matched: false });

			const type = id[start + 1] === '[' ? 'optional' : id[start + 1] === '.' ? 'rest' : 'required';
			const delimiter = type === 'optional' ? ']]' : ']';
			const end = id.indexOf(delimiter, start);

			if (end === -1) {
				throw new Error(`Invalid route ID ${id}`);
			}

			const content = id.slice(start, (i = end + delimiter.length));

			parts.push({
				type,
				content,
				matched: content.includes('=')
			});
		}

		return parts;
	}

	return routes.sort((route_a, route_b) => {
		const [segments_a, segments_a_all] = split_route_id(route_a.id);
		const [segments_b, segments_b_all] = split_route_id(route_b.id);

		const result = compare_segments(segments_a, segments_b, segments_a_all, segments_b_all);
		if (result !== undefined) return result;

		// If the routes are identical up to this point, we try again, this time keeping
		// rest and optional routes, so we can take into account their matchers etc.
		return compare_segments(segments_a_all, segments_b_all, segments_a_all, segments_b_all) ??
			route_a.id < route_b.id
			? +1
			: -1; // TODO error on conflicts?
	});
}

/**
 * @param {Array<Part[] | undefined>} segments_a
 * @param {Array<Part[] | undefined>} segments_b
 * @param {Array<Part[] | undefined>} segments_a_all
 * @param {Array<Part[] | undefined>} segments_b_all
 * @returns
 */
function compare_segments(segments_a, segments_b, segments_a_all, segments_b_all) {
	for (let i = 0; i < Math.max(segments_a.length, segments_b.length); i += 1) {
		const segment_a = segments_a[i];
		const segment_b = segments_b[i];

		// shallower path outranks deeper path, unless the last segment is optional and their length is equal if optional segments are kept,
		// which means they have the same amount of optional segments, so the one with more of them on the left is more specific.
		if (!segment_a || !segment_b) {
			if (segments_a_all.length === segments_b_all.length) {
				const segment_a_optional =
					segment_a?.length === 3 &&
					(segment_a[1].type === 'optional' || segment_a[1].type === 'rest');
				const segment_b_optional =
					segment_b?.length === 3 &&
					(segment_b[1].type === 'optional' || segment_b[1].type === 'rest');
				if (segment_a_optional) return -1;
				if (segment_b_optional) return +1;
			}

			if (!segment_a) return -1;
			if (!segment_b) return +1;
		}

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

				// part with matcher outranks one without
				if (a.matched !== b.matched) {
					return a.matched ? -1 : +1;
				}

				if (a.type !== b.type) {
					// [required] outranks [[optional]] or [...rest]
					if (a.type === 'required') return -1;
					if (b.type === 'required') return +1;

					// [[optional]] outranks [...rest]
					if (a.type === 'optional') return -1;
					if (b.type === 'optional') return +1;
				}
			}

			if (a.content !== b.content) {
				return sort_static(a.content, b.content);
			}
		}
	}
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
