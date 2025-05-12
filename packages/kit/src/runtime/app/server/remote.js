import { stringify, uneval, parse } from 'devalue';
import { getRequestEvent } from './event.js';
import { stringify_rpc_response } from '../../server/remote/index.js';
import { json } from '../../../exports/index.js';
import { app_dir } from '__sveltekit/paths';
import { DEV } from 'esm-env';

/**
 * @template {(formData: FormData) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function formAction(fn) {
	/** @param {FormData} form_data */
	const wrapper = async (form_data) => {
		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(form_data);
		event._.remote_results[wrapper.action] = uneval_remote_response(result, event._.transport);
		return result;
	};
	// TODO clean up
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, 'method', {
		value: 'POST',
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, 'action', {
		value: '',
		writable: true
	});
	Object.defineProperty(wrapper, 'enhance', {
		value: () => {
			return { action: wrapper.action, method: wrapper.method };
		},
		writable: false,
		enumerable: false,
		configurable: false
	});
	Object.defineProperty(wrapper, 'formAction', {
		value: {
			formaction: '',
			enhance: () => {
				return { formaction: wrapper.formAction.formaction };
			}
		},
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, '__type', {
		value: 'formAction',
		writable: false,
		enumerable: true,
		configurable: false
	});
	let set = false;
	Object.defineProperty(wrapper, '_set_action', {
		/** @param {string} action */
		value: (action) => {
			if (set) return;
			set = true;
			wrapper.action = `?/remote=${encodeURIComponent(action)}`;
			wrapper.formAction.formaction = `?/remote=${encodeURIComponent(action)}`;
		},
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, 'result', {
		get() {
			try {
				const event = getRequestEvent();
				return event._.remote_results[wrapper.action] ?? null;
			} catch (e) {
				return null;
			}
		},
		enumerable: true,
		configurable: false
	});

	// @ts-expect-error
	return wrapper;
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function query(fn) {
	/** @param {...Parameters<T>} args */
	const wrapper = async (...args) => {
		// TODO don't do the additional work when we're being called from the client?
		const event = getRequestEvent();
		const result = await fn(...args);
		const stringified_args = stringify(args, event._.transport);
		event._.remote_results[wrapper.__id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);
		if (event._.remote_prerendering) {
			const body = stringify_rpc_response(result, event._.transport);
			// TODO for prerendering we need to make the query args part of the pathname
			event._.remote_prerendering.dependencies.set(`/${app_dir}/remote/${wrapper.__id}`, {
				body,
				response: json(body)
			});
		}
		return result;
	};
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, '__type', {
		value: 'query',
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(wrapper, 'key', {
		get() {
			return `query:${wrapper.__id}|`;
		}
	});
	// TODO how do we do `keyFor`? We don't have access to the serializer here as it's in the client
	// @ts-expect-error
	return wrapper;
}

/**
 * @param {any} data
 * @param {import('types').ServerHooks['transport']} transport
 */
export function uneval_remote_response(data, transport) {
	const replacer = (/** @type {any} */ thing) => {
		for (const key in transport) {
			const encoded = transport[key].encode(thing);
			if (encoded) {
				return `app.decode('${key}', ${uneval(encoded, replacer)})`;
			}
		}
	};

	// TODO try_serialize
	return uneval(data, replacer);
}

/**
 * @param {any} data
 * @param {import('types').ServerHooks['transport']} transport
 */
function parse_remote_response(data, transport) {
	/** @type {Record<string, any>} */
	const revivers = {};
	for (const key in transport) {
		revivers[key] = transport[key].decode;
	}

	return parse(data, revivers);
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function action(fn) {
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(fn, '__type', {
		value: 'action',
		writable: false,
		enumerable: true,
		configurable: false
	});
	return fn;
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {{entries:() => import('types').MaybePromise<Array<any[]>>}} entries
 * @returns {T}
 */
export function prerender(fn, { entries } = {}) {
	/** @param {...Parameters<T>} args */
	const wrapper = async (...args) => {
		// TODO deduplicate this with query/cache
		const event = getRequestEvent();
		const result = await fn(...args);
		const stringified_args = stringify(args, event._.transport);
		event._.remote_results[wrapper.__id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);
		if (event._.remote_prerendering) {
			const body = stringify_rpc_response(result, event._.transport);
			// TODO for prerendering we need to make the query args part of the pathname
			event._.remote_prerendering.dependencies.set(`/${app_dir}/remote/${wrapper.__id}`, {
				body,
				response: json(body)
			});
		}
		return result;
	};
	wrapper.__entries = entries;
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, '__type', {
		value: 'prerender',
		writable: false,
		enumerable: true,
		configurable: false
	});

	// @ts-expect-error
	return wrapper;
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {Record<string, any>} config
 * @returns {T}
 */
export function cache(fn, config) {
	/** @param {...Parameters<T>} args */
	const wrapper = async (...args) => {
		// TODO deduplicate this with query/prerender
		const event = getRequestEvent();
		const stringified_args = stringify(args, event._.transport);

		let result;
		const is_cached = wrapper.cache.has(stringified_args);
		if (is_cached) {
			// TODO brings back stringified which we need to decode but thats stupid because we decode and stringify right away again
			result = parse_remote_response(wrapper.cache.get(stringified_args), event._.transport);
		} else {
			result = await fn(...args);
		}

		event._.remote_results[wrapper.__id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);

		if (event._.remote_prerendering) {
			const body = stringify_rpc_response(result, event._.transport);
			// TODO for prerendering we need to make the query args part of the pathname
			event._.remote_prerendering.dependencies.set(`/${app_dir}/remote/${wrapper.__id}`, {
				body,
				response: json(body)
			});
		} else if (!is_cached) {
			const body = stringify_rpc_response(result, event._.transport);
			wrapper.cache.set(stringified_args, body);
		}
		return result;
	};
	wrapper.__config = config;

	if (DEV) {
		// In memory cache that hopefully resets on changes?
		/** @type {Record<string, string>} */
		const cached = {};
		wrapper.cache = {
			get(input) {
				return cached[input];
			},
			has(input) {
				return input in cached;
			},
			set(input, output) {
				cached[input] = output;
				setTimeout(() => {
					delete cached[input];
				}, wrapper.__config.expiration * 1000);
			},
			delete(input) {
				delete cached[input];
			}
		};
	} else {
		wrapper.cache = {
			// TODO warn somehow when adapter does not support cache?
			get() {},
			has() {
				return false;
			},
			set() {},
			delete() {}
		};
	}
	wrapper.refresh = (...args) => {
		// TODO is this agnostic enough / fine to require people calling this during a request event?
		const event = getRequestEvent();
		wrapper.cache.delete(stringify(args, event._.transport));
	};
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, '__type', {
		value: 'cache',
		writable: false,
		enumerable: true,
		configurable: false
	});

	// @ts-expect-error
	return wrapper;
}
