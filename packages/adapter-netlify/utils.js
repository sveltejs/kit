/** @import { Runtime } from './index.js' */

/**
 * @param {unknown} runtime
 * @returns {string}
 */
export function parse_node_version(runtime) {
	const match = typeof runtime === 'string' && /^nodejs([1-9]\d*)\.x$/.exec(runtime);
	if (!match) {
		throw new Error(
			`@sveltejs/adapter-netlify: Invalid runtime ${JSON.stringify(runtime)}. Use nodejs<major>.x with a positive integer major version, for example nodejs24.x.`
		);
	}
	return match[1];
}

/**
 * @param {{ edge?: boolean; runtime?: Runtime }} options
 * @param {boolean} [default_edge]
 * @returns {{ edge: boolean; node_version?: string }}
 */
export function resolve_runtime({ edge, runtime }, default_edge = false) {
	if (edge === true && runtime !== undefined) {
		throw new Error(
			'@sveltejs/adapter-netlify: Cannot combine edge: true with runtime. Remove runtime to use Edge Functions, or set edge: false to use a Node.js runtime.'
		);
	}

	if (runtime !== undefined) {
		return { edge: false, node_version: parse_node_version(runtime) };
	}

	return { edge: edge ?? default_edge };
}

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
 * @param {*} value
 * @returns {string}
 */
export function s(value) {
	return JSON.stringify(value, null, '\t');
}
