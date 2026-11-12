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

		// A rest parameter in either route can consume zero or more segments.
		if (a[0].rest) return matches(b, a);

		if (!b[0].dynamic) {
			if (!a[0].dynamic && a[0].content !== b[0].content) return false;
		}

		if (a.length === 1 && b.length === 1) return true;
		return matches(a.slice(1), b.slice(1));
	} else if (a[0]) {
		return a.every((segment) => segment.rest);
	} else {
		return b.length > 0 && b.every((segment) => segment.rest);
	}
}

/**
 * @param {*} value
 * @returns {string}
 */
export function s(value) {
	return JSON.stringify(value, null, '\t');
}
