/** @import { Runtime } from './index.js' */

/**
 * @param {unknown} node_version
 * @returns {string}
 */
export function parse_node_version(node_version) {
	const match = typeof node_version === 'string' && /^nodejs([1-9]\d*)\.x$/.exec(node_version);
	if (!match) {
		throw new Error(
			`@sveltejs/adapter-netlify: Invalid nodeVersion ${JSON.stringify(node_version)}. Use nodejs<major>.x with a positive integer major version, for example nodejs24.x.`
		);
	}
	return match[1];
}

/**
 * @param {{ edge?: boolean; nodeVersion?: Runtime }} options
 * @param {boolean} [default_edge]
 * @returns {{ edge: boolean; node_version?: string }}
 */
export function resolve_runtime({ edge, nodeVersion }, default_edge = false) {
	if (edge === true && nodeVersion !== undefined) {
		throw new Error(
			'@sveltejs/adapter-netlify: Cannot combine edge: true with nodeVersion. Remove nodeVersion to use Edge Functions, or set edge: false to use a Node.js runtime.'
		);
	}

	if (nodeVersion !== undefined) {
		return { edge: false, node_version: parse_node_version(nodeVersion) };
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
