/** @import { Runtime } from './index.js' */

/**
 * @param {unknown} node_version
 * @returns {string}
 */
export function parse_node_version(node_version) {
	const match = typeof node_version === 'string' && /^nodejs([1-9]\d*)\.x$/.exec(node_version);
	if (!match) {
		throw new Error(
			`@sveltejs/adapter-netlify: Invalid \`nodeVersion\` ${JSON.stringify(node_version)}. Use \`nodejs<major>.x\` with a positive integer major version, for example \`nodejs24.x\`.`
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
			'@sveltejs/adapter-netlify: Cannot combine `edge: true` with `nodeVersion`. Remove `nodeVersion` to use Edge Functions, or set `edge: false` to use a Node.js runtime.'
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

/** @param {RouteSegment} segment */
function can_be_empty(segment) {
	return segment.rest || /^\[\[.+\]\]$/.test(segment.content);
}

/**
 * Whether some path could match both routes. Param matchers are ignored,
 * so this errs on the side of `true`
 * @param {RouteSegment[]} a
 * @param {RouteSegment[]} b
 * @returns {boolean}
 */
export function overlaps(a, b) {
	if (a.length === 0 || b.length === 0) return [...a, ...b].every(can_be_empty);

	if (can_be_empty(a[0]) && overlaps(a.slice(1), b)) return true;
	if (can_be_empty(b[0]) && overlaps(a, b.slice(1))) return true;

	// from here on both segments consume one segment of the path
	if (!a[0].dynamic && !b[0].dynamic && a[0].content !== b[0].content) return false;
	// two rests that each consume a segment are back where they started
	if (a[0].rest && b[0].rest) return false;

	return overlaps(a[0].rest ? a : a.slice(1), b[0].rest ? b : b.slice(1));
}

/**
 * @param {{ segments: RouteSegment[] }} route
 * @returns {string}
 */
export function get_route_pattern(route) {
	/** @type {string[]} */
	const parts = [];

	// The parts should conform to URLPattern syntax
	// https://docs.netlify.com/build/functions/get-started/?fn-language=ts&data-tab=TypeScript#route-requests
	for (const [i, segment] of route.segments.entries()) {
		if (segment.rest) {
			parts.push('*');
		} else if (segment.dynamic) {
			// URLPattern requires params to start with letters
			const optional = /^\[\[.+\]\]$/.test(segment.content) ? '?' : '';
			parts.push(`:param${i}${optional}`);
		} else {
			parts.push(segment.content);
		}
	}

	// Netlify handles trailing slashes for us, so we don't need to include them in the pattern
	return `/${parts.join('/')}`;
}

/**
 * Assigns each route to a function such that at most one function can answer a given path.
 * Netlify runs edge functions before serverless ones and otherwise picks between overlapping
 * functions by name, so each function excludes the higher priority routes it overlaps
 * @template {{ id: string, segments: RouteSegment[], prerender: unknown }} Route
 * @template Runtime
 * @param {Route[]} routes in priority order
 * @param {(route: Route) => { runtime: Runtime, split: boolean }} get_config
 * @returns {Array<{ runtime: Runtime, split: boolean, routes: Route[], patterns: string[], exclude: string[] }>}
 */
export function plan_functions(routes, get_config) {
	/** @typedef {{ runtime: Runtime, split: boolean, members: number[], patterns: string[], exclude: Set<string> }} Group */
	/** @type {Group[]} */
	const groups = [];
	/** @type {Array<{ index: number, pattern: string, patterns: string[], group: Group }>} */
	const placed = [];

	for (const [index, route] of routes.entries()) {
		if (route.prerender === true) continue;

		const { runtime, split } = get_config(route);
		const pattern = get_route_pattern(route);

		// URLPattern can't tell these apart, so the first route's function has to serve both
		const twin = placed.find((other) => other.pattern === pattern);
		if (twin) {
			if (twin.group.runtime !== runtime || twin.group.split !== split) {
				throw new Error(
					`The ${route.id} and ${routes[twin.index].id} routes normalize to the same Netlify pattern (${pattern}), but have incompatible deployment configs. Rename one of the routes or make their edge, nodeVersion and split configs match.`
				);
			}
			twin.group.members.push(index);
			continue;
		}

		const higher = placed.filter((other) => overlaps(routes[other.index].segments, route.segments));

		// A group has to exclude the higher priority routes of other functions that this route
		// overlaps. It can't take the route if that would also exclude paths that belong to
		// one of its own, even higher priority, routes
		let group = split
			? undefined
			: groups.find(
					(group) =>
						!group.split &&
						group.runtime === runtime &&
						!higher.some(
							(other) =>
								other.group !== group &&
								group.members.some(
									(member) =>
										member < other.index &&
										overlaps(routes[member].segments, routes[other.index].segments)
								)
						)
				);

		if (!group) {
			groups.push((group = { runtime, split, members: [], patterns: [], exclude: new Set() }));
		}

		const patterns = [pattern, `${pattern === '/' ? '' : pattern}/__data.json`];
		group.members.push(index);
		group.patterns.push(...patterns);
		for (const other of higher) {
			if (other.group !== group) other.patterns.forEach((pattern) => group.exclude.add(pattern));
		}
		placed.push({ index, pattern, patterns, group });
	}

	return groups.map((group) => ({
		runtime: group.runtime,
		split: group.split,
		// a function also needs the lower priority routes its own routes can fall back to
		routes: routes.filter(
			(route, index) =>
				route.prerender !== true &&
				group.members.some(
					(member) =>
						member === index || (member < index && matches(routes[member].segments, route.segments))
				)
		),
		patterns: group.patterns,
		exclude: Array.from(group.exclude)
	}));
}

/**
 * @param {*} value
 * @returns {string}
 */
export function s(value) {
	return JSON.stringify(value, null, '\t');
}
