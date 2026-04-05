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

/**
 * @param {unknown} thing
 * @returns {thing is Record<PropertyKey, unknown>}
 */
function is_plain_object(thing) {
	if (typeof thing !== 'object' || thing === null) return false;
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

// "sveltekit remote arg"
const remote_object = '__skrao';
const remote_map = '__skram';
const remote_set = '__skras';
const remote_regex_guard = '__skrag';
const remote_arg_marker = Symbol(remote_object);

/**
 * @param {Transport} transport
 * @param {boolean} sort
 * @param {Map<any, any>} remote_arg_clones
 */
function create_remote_arg_reducers(transport, sort, remote_arg_clones) {
	/** @type {Record<string, (value: unknown) => unknown>} */
	const remote_fns_reducers = {
		[remote_regex_guard]:
			/** @type {(value: unknown) => void} */
			(value) => {
				if (value instanceof RegExp) {
					throw new Error('Regular expressions are not valid remote function arguments');
				}
			}
	};

	if (sort) {
		/** @type {(value: unknown) => Array<[unknown, unknown]> | undefined} */
		remote_fns_reducers[remote_map] = (value) => {
			if (!(value instanceof Map)) {
				return;
			}

			/** @type {Array<[string, string]>} */
			const entries = [];

			for (const [key, val] of value) {
				entries.push([stringify(key), stringify(val)]);
			}

			return entries.sort(([a1, a2], [b1, b2]) => {
				if (a1 < b1) return -1;
				if (a1 > b1) return 1;
				if (a2 < b2) return -1;
				if (a2 > b2) return 1;
				return 0;
			});
		};

		/** @type {(value: unknown) => unknown[] | undefined} */
		remote_fns_reducers[remote_set] = (value) => {
			if (!(value instanceof Set)) {
				return;
			}

			/** @type {string[]} */
			const items = [];

			for (const item of value) {
				items.push(stringify(item));
			}

			items.sort();
			return items;
		};

		/** @type {(value: unknown) => Record<PropertyKey, unknown> | undefined} */
		remote_fns_reducers[remote_object] = (value) => {
			if (!is_plain_object(value)) {
				return;
			}

			if (Object.hasOwn(value, remote_arg_marker)) {
				return;
			}

			if (remote_arg_clones.has(value)) {
				return remote_arg_clones.get(value);
			}

			return to_sorted(value, remote_arg_clones);
		};
	}

	const user_reducers = Object.fromEntries(
		Object.entries(transport).map(([k, v]) => [k, v.encode])
	);
	const all_reducers = { ...user_reducers, ...remote_fns_reducers };

	/** @type {(value: unknown) => string} */
	const stringify = (value) => devalue.stringify(value, all_reducers);

	return all_reducers;
}

/** @param {Transport} transport */
function create_remote_arg_revivers(transport) {
	const remote_fns_revivers = {
		/** @type {(value: unknown) => unknown} */
		[remote_object]: (value) => value,
		/** @type {(value: unknown) => Map<unknown, unknown>} */
		[remote_map]: (value) => {
			if (!Array.isArray(value)) {
				throw new Error('Invalid data for Map reviver');
			}

			const map = new Map();

			for (const item of value) {
				if (
					!Array.isArray(item) ||
					item.length !== 2 ||
					typeof item[0] !== 'string' ||
					typeof item[1] !== 'string'
				) {
					throw new Error('Invalid data for Map reviver');
				}
				const [key, val] = item;
				map.set(parse(key), parse(val));
			}

			return map;
		},
		/** @type {(value: unknown) => Set<unknown>} */
		[remote_set]: (value) => {
			if (!Array.isArray(value)) {
				throw new Error('Invalid data for Set reviver');
			}

			const set = new Set();

			for (const item of value) {
				if (typeof item !== 'string') {
					throw new Error('Invalid data for Set reviver');
				}
				set.add(parse(item));
			}

			return set;
		}
	};

	const user_revivers = Object.fromEntries(
		Object.entries(transport).map(([k, v]) => [k, v.decode])
	);

	const all_revivers = { ...user_revivers, ...remote_fns_revivers };

	/** @type {(data: string) => unknown} */
	const parse = (data) => devalue.parse(data, all_revivers);

	return all_revivers;
}

/**
 * Stringifies the argument (if any) for a remote function in such a way that
 * it is both a valid URL and a valid file name (necessary for prerendering).
 * @param {any} value
 * @param {Transport} transport
 * @param {boolean} [sort]
 */
export function stringify_remote_arg(value, transport, sort = true) {
	if (value === undefined) return '';

	// If people hit file/url size limits, we can look into using something like compress_and_encode_text from svelte.dev beyond a certain size
	const json_string = devalue.stringify(
		value,
		create_remote_arg_reducers(transport, sort, new Map())
	);

	const bytes = new TextEncoder().encode(json_string);
	return base64_encode(bytes).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
}

/**
 * Parses the argument (if any) for a remote function
 * @param {string} string
 * @param {Transport} transport
 */
export function parse_remote_arg(string, transport) {
	if (!string) return undefined;

	const json_string = text_decoder.decode(
		// no need to add back `=` characters, atob can handle it
		base64_decode(string.replaceAll('-', '+').replaceAll('_', '/'))
	);

	return devalue.parse(json_string, create_remote_arg_revivers(transport));
}

/**
 * @param {string} id
 * @param {string} payload
 */
export function create_remote_key(id, payload) {
	return id + '/' + payload;
}

/**
 * @param {string} key
 * @returns {{ id: string; payload: string }}
 */
export function split_remote_key(key) {
	const i = key.lastIndexOf('/');

	if (i === -1) {
		throw new Error(`Invalid remote key: ${key}`);
	}

	return {
		id: key.slice(0, i),
		payload: key.slice(i + 1)
	};
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
