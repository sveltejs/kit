/**
 * @typedef {{ rest: boolean, dynamic: boolean, content: string }} RouteSegment
 */

/**
 * @param {RouteSegment[]} a
 * @param {RouteSegment[]} b
 * @returns {boolean}
 */
export function matches(a, b) {
	if (a[0] && b[0]) {
		if (b[0].rest) {
			if (b.length === 1) return true;

			const next_b = b.slice(1);

			for (let i = 0; i < a.length; i += 1) {
				if (matches(a.slice(i), next_b)) return true;
			}

			return false;
		}

		if (!b[0].dynamic) {
			if (!a[0].dynamic && a[0].content !== b[0].content) return false;
		}

		if (a.length === 1 && b.length === 1) return true;
		return matches(a.slice(1), b.slice(1));
	} else if (a[0]) {
		return a.length === 1 && a[0].rest;
	} else {
		return b.length === 1 && b[0].rest;
	}
}

/**
 * Whether two routes can never match the same path, because they differ
 * in a static segment before either has a dynamic one
 * @param {RouteSegment[]} a
 * @param {RouteSegment[]} b
 * @returns {boolean}
 */
export function disjoint(a, b) {
	for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
		if (a[i].dynamic || b[i].dynamic) return false;
		if (a[i].content !== b[i].content) return true;
	}

	return false;
}

/**
 * @param {*} value
 * @returns {string}
 */
export function s(value) {
	return JSON.stringify(value, null, '\t');
}
