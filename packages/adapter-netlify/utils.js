/**
 * @typedef {{ rest: boolean, dynamic: boolean, content: string }} RouteSegment
 */

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * }} NetlifyConfig
 */

const valid_runtimes = /** @type {const} */ (['edge', 'nodejs22.x', 'nodejs24.x', 'nodejs26.x']);

/**
 * @param {Runtime} [runtime]
 * @returns {{ primitive: 'edge' | 'nodejs', version: string | undefined }}
 */
export function parse_runtime(runtime) {
	if (runtime === undefined) return { primitive: 'nodejs', version: undefined };
	if (runtime === 'edge') return { primitive: 'edge', version: undefined };

	if (valid_runtimes.includes(runtime)) {
		return { primitive: 'nodejs', version: runtime.slice('nodejs'.length, -'.x'.length) };
	}

	throw new Error(
		`Invalid runtime ${JSON.stringify(runtime)}. Supported runtimes are: ${valid_runtimes.join(', ')}.`
	);
}

/** @typedef {typeof valid_runtimes[number]} Runtime */

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
 * @param {*} value
 * @returns {string}
 */
export function s(value) {
	return JSON.stringify(value, null, '\t');
}
