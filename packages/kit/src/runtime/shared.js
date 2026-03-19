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

const object_proto_names = /* @__PURE__ */ Object.getOwnPropertyNames(Object.prototype)
	.sort()
	.join('\0');

/** @param {any} thing */
function is_plain_object(thing) {
	const proto = Object.getPrototypeOf(thing);

	return (
		proto === Object.prototype ||
		proto === null ||
		Object.getPrototypeOf(proto) === null ||
		Object.getOwnPropertyNames(proto).sort().join('\0') === object_proto_names
	);
}

/**
 * @param {Record<string, any>} value
 * @param {Map<object, any>} clones
 */
function to_sorted(value, clones) {
	const clone = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
	clones.set(value, clone);
	Object.defineProperty(clone, remote_arg_marker, { value: true });

	for (const key of Object.keys(value).sort()) {
		const property = value[key];
		Object.defineProperty(clone, key, {
			value: clones.get(property) ?? property,
			enumerable: true,
			configurable: true,
			writable: true
		});
	}

	return clone;
}

const remote_arg_clones = new Map();

// "sveltekit remote arg"
const remote_arg_reducer = '__skra';
const remote_arg_marker = Symbol(remote_arg_reducer);

const remote_arg_reducers = {
	[remote_arg_reducer]:
		/** @type {(value: unknown) => unknown} */
		(value) => {
			if (typeof value !== 'object' || value === null) {
				return;
			}

			if (Object.hasOwn(value, remote_arg_marker)) {
				return;
			}

			if (value instanceof Map) {
				throw new Error('Maps are not valid remote function arguments');
			}

			if (value instanceof Set) {
				throw new Error('Sets are not valid remote function arguments');
			}

			if (value instanceof RegExp) {
				throw new Error('Regular expressions are not valid remote function arguments');
			}

			if (is_plain_object(value)) {
				return remote_arg_clones.get(value) ?? to_sorted(value, remote_arg_clones);
			}
		}
};

/**
 * Stringifies the argument (if any) for a remote function in such a way that
 * it is both a valid URL and a valid file name (necessary for prerendering).
 * @param {any} value
 */
export function stringify_remote_arg(value) {
	if (value === undefined) return '';

	// If people hit file/url size limits, we can look into using something like compress_and_encode_text from svelte.dev beyond a certain size
	const json_string = devalue.stringify(value, remote_arg_reducers);
	remote_arg_clones.clear();

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

	return devalue.parse(json_string, {
		[remote_arg_reducer]: (value) => value
	});
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
