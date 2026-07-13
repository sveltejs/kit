/** @import { Transport } from '@sveltejs/kit' */
import * as devalue from 'devalue';
import { base64_decode, base64_encode, text_decoder, text_encoder } from './utils.js';

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
 * Cached per-transport derivatives, so we don't rebuild them on every
 * stringify/parse call (the transport object is stable for the lifetime
 * of the app on both client and server).
 * @typedef {{
 *   encoders: Record<string, (value: any) => any>;
 *   decoders: Record<string, (value: any) => any>;
 *   revivers?: Record<string, (value: any) => any>;
 *   sorted?: { reducers: Record<string, (value: unknown) => unknown>; state: { clones: Map<any, any> } };
 *   command_reducers_base?: Record<string, (value: unknown) => unknown>;
 * }} TransportDerivatives
 */

/** @type {WeakMap<Transport, TransportDerivatives>} */
const transport_derivatives = new WeakMap();

/** @param {Transport} transport */
function get_derivatives(transport) {
	let cached = transport_derivatives.get(transport);

	if (cached === undefined) {
		cached = {
			encoders: Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.encode])),
			decoders: Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]))
		};
		transport_derivatives.set(transport, cached);
	}

	return cached;
}

/**
 * Try to `devalue.stringify` the data object using the provided transport encoders.
 * @param {any} data
 * @param {Transport} transport
 */
export function stringify(data, transport) {
	return devalue.stringify(data, get_derivatives(transport).encoders);
}

/**
 * Returns the (cached) transport decoders, used for reviving devalue payloads.
 * @param {Transport} transport
 */
export function get_transport_decoders(transport) {
	return get_derivatives(transport).decoders;
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
const remote_file = '__skraf';
const remote_promise_guard = '__skrap';
const remote_regex_guard = '__skrag';
const remote_arg_marker = Symbol(remote_object);

/**
 * Builds (and caches per transport) the `sort: true` reducers used by
 * `stringify_remote_arg`. The only per-call state is the `remote_arg_clones`
 * map, which is held in a swappable `state.clones` handle so the cached
 * reducers can be reused across calls (and reentrant calls) without bleeding
 * state.
 * @param {Transport} transport
 */
function get_sorted_reducers(transport) {
	const derivatives = get_derivatives(transport);

	if (derivatives.sorted === undefined) {
		/** @type {{ clones: Map<any, any> }} */
		const state = { clones: new Map() };

		/** @type {Record<string, (value: unknown) => unknown>} */
		const remote_fns_reducers = {
			/** @param {unknown} value */
			[remote_regex_guard]: (value) => {
				if (value instanceof RegExp) {
					throw new Error('Regular expressions are not valid remote function arguments');
				}
			},
			/** @type {(value: unknown) => Array<[unknown, unknown]> | undefined} */
			[remote_map]: (value) => {
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
			},
			/** @type {(value: unknown) => unknown[] | undefined} */
			[remote_set]: (value) => {
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
			},
			/** @type {(value: unknown) => Record<PropertyKey, unknown> | undefined} */
			[remote_object]: (value) => {
				if (!is_plain_object(value)) {
					return;
				}

				if (Object.hasOwn(value, remote_arg_marker)) {
					return;
				}

				if (state.clones.has(value)) {
					return state.clones.get(value);
				}

				return to_sorted(value, state.clones);
			}
		};

		const all_reducers = { ...derivatives.encoders, ...remote_fns_reducers };

		/** @type {(value: unknown) => string} */
		const stringify = (value) => devalue.stringify(value, all_reducers);

		derivatives.sorted = { reducers: all_reducers, state };
	}

	return derivatives.sorted;
}

/**
 * Builds (and caches per transport) the `sort: false` base reducers used by
 * `stringify_command_arg`. The per-call `remote_file`/`remote_promise_guard`
 * reducers (which close over per-call state) are spread on top by the caller.
 * @param {Transport} transport
 */
function get_command_reducers_base(transport) {
	const derivatives = get_derivatives(transport);

	if (derivatives.command_reducers_base === undefined) {
		derivatives.command_reducers_base = {
			...derivatives.encoders,
			/** @param {unknown} value */
			[remote_regex_guard]: (value) => {
				if (value instanceof RegExp) {
					throw new Error('Regular expressions are not valid remote function arguments');
				}
			}
		};
	}

	return derivatives.command_reducers_base;
}

/** @param {Transport} transport */
function get_revivers(transport) {
	const derivatives = get_derivatives(transport);

	if (derivatives.revivers !== undefined) {
		return derivatives.revivers;
	}

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
		},
		/** @type {(value: any) => File} */
		[remote_file]: (value) => {
			if (
				!value ||
				typeof value !== 'object' ||
				typeof value.name !== 'string' ||
				typeof value.type !== 'string' ||
				typeof value.size !== 'number' ||
				typeof value.lastModified !== 'number' ||
				!(value.data instanceof ArrayBuffer)
			) {
				throw new Error('Invalid data for File reviver');
			}

			const { data, name, ...meta } = value;

			return new File([data], name, meta);
		}
	};

	const all_revivers = { ...derivatives.decoders, ...remote_fns_revivers };

	/** @type {(data: string) => unknown} */
	const parse = (data) => devalue.parse(data, all_revivers);

	derivatives.revivers = all_revivers;

	return all_revivers;
}

/**
 * Stringifies the argument (if any) for a remote function in such a way that
 * it is both a valid URL and a valid file name (necessary for prerendering).
 * @param {any} value
 * @param {Transport} transport
 */
export function stringify_remote_arg(value, transport) {
	if (value === undefined) return '';

	const { reducers, state } = get_sorted_reducers(transport);

	// the clones map is per-call state; swap in a fresh one for the duration of
	// the (synchronous) `devalue.stringify` call and restore the previous one
	// afterwards, so reentrant calls (a transport encoder that itself calls
	// `stringify_remote_arg`) cannot corrupt each other's state
	const previous = state.clones;
	state.clones = new Map();

	try {
		// If people hit file/url size limits, we can look into using something like compress_and_encode_text from svelte.dev beyond a certain size
		const json = devalue.stringify(value, reducers);

		return url_friendly_base64_encode(json);
	} finally {
		state.clones = previous;
	}
}

/**
 * Stringifies command arguments, including `File` objects.
 * @param {any} value
 * @param {Transport} transport
 */
export async function stringify_command_arg(value, transport) {
	if (value === undefined) return '';

	/** @type {Set<Promise<any>>} */
	const allowed_promises = new Set();

	const reducers = {
		...get_command_reducers_base(transport),
		/** @param {any} value */
		[remote_file]: (value) => {
			if (value instanceof File) {
				const promise = value.arrayBuffer().then((data) => ({
					data,
					lastModified: value.lastModified,
					name: value.name,
					size: value.size,
					type: value.type
				}));

				allowed_promises.add(promise);

				return promise;
			}
		},
		// we don't want to allow arbitrary promises, because they won't
		// show up as promises on the other side. this is something
		// we could potentially change in future. stringifyAsync
		// will await them, so we need to explicitly deny them
		/** @param {unknown} value */
		[remote_promise_guard]: (value) => {
			if (value instanceof Promise && !allowed_promises.has(value)) {
				throw new Error('Promises are not valid remote function arguments');
			}
		}
	};

	const json = await devalue.stringifyAsync(value, reducers);

	return url_friendly_base64_encode(json);
}

/**
 * Base64-encodes `string` in such a way that the result is safe to use
 * as both a URI component and a filename
 * @param {string} string
 */
function url_friendly_base64_encode(string) {
	const bytes = text_encoder.encode(string);
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

	return devalue.parse(json_string, get_revivers(transport));
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
