import { pathToRegexp } from 'path-to-regexp';

/** @param {import("@sveltejs/kit").RouteDefinition<any>} route */
export function get_pathname(route) {
	let i = 1;

	const pathname = route.segments
		.map((segment) => {
			if (!segment.dynamic) {
				return '/' + segment.content;
			}

			const parts = segment.content.split(/\[(.+?)\](?!\])/);
			let result = '';

			if (
				parts.length === 3 &&
				!parts[0] &&
				!parts[2] &&
				(parts[1].startsWith('...') || parts[1][0] === '[')
			) {
				// Special case: segment is a single optional or rest parameter.
				// In that case we don't prepend a slash (also see comment in pattern_to_src).
				result = `$${i++}`;
			} else {
				result =
					'/' +
					parts
						.map((content, j) => {
							if (j % 2) {
								return `$${i++}`;
							} else {
								return content;
							}
						})
						.join('');
			}

			return result;
		})
		.join('');

	return pathname[0] === '/' ? pathname.slice(1) : pathname;
}

/**
 * Adjusts the stringified route regex for Vercel's routing system
 * @param {string} pattern stringified route regex
 */
export function pattern_to_src(pattern) {
	let src = pattern
		// remove leading / and trailing $/
		.slice(1, -2)
		// replace escaped \/ with /
		.replace(/\\\//g, '/');

	// replace the root route "^/" with "^/?"
	if (src === '^/') {
		src = '^/?';
	}

	// Move non-capturing groups that swallow slashes into their following capturing groups.
	// This is necessary because during ISR we're using the regex to construct the __pathname
	// query parameter: In case of a route like [required]/[...rest] we need to turn them
	// into $1$2 and not $1/$2, because if [...rest] is empty, we don't want to have a trailing
	// slash in the __pathname query parameter which wasn't there in the original URL, as that
	// could result in a false trailing slash redirect in the SvelteKit runtime, leading to infinite redirects.
	src = src.replace(/\(\?:\/\((.+?)\)\)/g, '(/$1)');

	return src;
}

/**
 * @param {unknown} matchers
 * @returns {string}
 */
export function get_regex_from_matchers(matchers) {
	const regex = getRegExpFromMatchers(matchers);
	// Make sure that we also match on our special internal routes
	const special_routes = ['__data.json', '__route.js'];
	const modified_regex = regex
		.replace(/\$\|\^/g, `(?:|${special_routes.join('|')})$|`)
		.replace(/\$$/g, `(?:|${special_routes.join('|')})$`);
	return modified_regex;
}

// Copied from https://github.com/vercel/vercel/blob/main/packages/node/src/utils.ts#L97 which hopefully is available via @vercel/routing-utils at some point
/**
 * @param {unknown} matcherOrMatchers
 * @returns {string}
 */
function getRegExpFromMatchers(matcherOrMatchers) {
	if (!matcherOrMatchers) {
		return '^/.*$';
	}
	const matchers = Array.isArray(matcherOrMatchers) ? matcherOrMatchers : [matcherOrMatchers];
	const regExps = matchers.flatMap(getRegExpFromMatcher).join('|');
	return regExps;
}

/**
 * @param {unknown} matcher
 * @param {number} _index
 * @param {unknown[]} allMatchers
 * @returns {string[]}
 */
function getRegExpFromMatcher(matcher, _index, allMatchers) {
	if (typeof matcher !== 'string') {
		throw new Error(
			"Middleware's `config.matcher` must be a path matcher (string) or an array of path matchers (string[])"
		);
	}

	if (!matcher.startsWith('/')) {
		throw new Error(
			`Middleware's \`config.matcher\` values must start with "/". Received: ${matcher}`
		);
	}

	const regExps = [pathToRegexp(matcher).source];
	if (matcher === '/' && !allMatchers.includes('/index')) {
		regExps.push(pathToRegexp('/index').source);
	}
	return regExps;
}
