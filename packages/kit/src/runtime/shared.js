/** @import { Transport } from '@sveltejs/kit' */
import * as devalue from 'devalue';
import { base64_decode, base64_encode, text_decoder } from './utils.js';
import * as svelte from 'svelte';

/**
 * @param {string} route_id
 * @param {string} dep
 */
export function validate_depends(route_id, dep) {
	const match = /^(moz-icon|view-source|jar):/.exec(dep);
	if (match) {
		console.warn(
			`${route_id}: Calling \`depends('${dep}')\` will throw an error in Firefox because \`${match[1]}\` is a special URI scheme`
		);
	}
}

export const INVALIDATED_PARAM = 'x-sveltekit-invalidated';

export const TRAILING_SLASH_PARAM = 'x-sveltekit-trailing-slash';

/**
 * @param {any} data
 * @param {string} [location_description]
 */
export function validate_load_response(data, location_description) {
	if (data != null && Object.getPrototypeOf(data) !== Object.prototype) {
		throw new Error(
			`a load function ${location_description} returned ${
				typeof data !== 'object'
					? `a ${typeof data}`
					: data instanceof Response
						? 'a Response object'
						: Array.isArray(data)
							? 'an array'
							: 'a non-plain object'
			}, but must return a plain object at the top level (i.e. \`return {...}\`)`
		);
	}
}

/**
 * Try to `devalue.stringify` the data object using the provided transport encoders.
 * @param {any} data
 * @param {Transport} transport
 */
export function stringify(data, transport) {
	const encoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.encode]));

	return devalue.stringify(data, encoders);
}

/**
 * @param {Record<string, any>} value
 * @param {Map<object, any>} cache
 */
function to_sorted(value, cache) {
	if (typeof value !== 'object' || value === null) {
		return value;
	}

	let cached = cache.get(value);

	if (cached === undefined) {
		if (value instanceof Map) {
			throw new Error('Maps are not valid remote function arguments');
		}

		if (value instanceof Set) {
			throw new Error('Sets are not valid remote function arguments');
		}

		if (value instanceof RegExp) {
			throw new Error('Regular expressions are not valid remote function arguments');
		}

		const prototype = Object.getPrototypeOf(value);

		if (prototype === Array.prototype) {
			cache.set(value, (cached = []));

			for (let i = 0; i < value.length; i += 1) {
				if (i in value) {
					cached[i] = to_sorted(value[i], cache);
				}
			}
		} else if (prototype === null || prototype === Object.prototype) {
			cache.set(value, (cached = Object.create(prototype)));

			for (const key of Object.keys(value).sort()) {
				cached[key] = to_sorted(value[key], cache);
			}
		} else {
			cache.set(value, (cached = value));
		}
	}

	return cached;
}

/**
 * Stringifies the argument (if any) for a remote function in such a way that
 * it is both a valid URL and a valid file name (necessary for prerendering).
 * @param {any} value
 */
export function stringify_remote_arg(value) {
	if (value === undefined) return '';

	// If people hit file/url size limits, we can look into using something like compress_and_encode_text from svelte.dev beyond a certain size
	const json_string = devalue.stringify(to_sorted(value, new Map()));

	const bytes = new TextEncoder().encode(json_string);
	return base64_encode(bytes).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
}

/**
 * Parses the argument (if any) for a remote function
 * @param {string} string
 */
export function parse_remote_arg(string) {
	if (!string) return undefined;

	const json_string = text_decoder.decode(
		// no need to add back `=` characters, atob can handle it
		base64_decode(string.replaceAll('-', '+').replaceAll('_', '/'))
	);

	return devalue.parse(json_string);
}

/**
 * @param {string} id
 * @param {string} payload
 */
export function create_remote_key(id, payload) {
	return id + '/' + payload;
}

/**
 * @template T
 * @param {string} key
 * @param {() => T} fn
 * @returns {T}
 * @deprecated TODO remove in SvelteKit 3.0
 */
export function unfriendly_hydratable(key, fn) {
	if (!svelte.hydratable) {
		throw new Error('Remote functions require Svelte 5.44.0 or later');
	}
	return svelte.hydratable(key, fn);
}
