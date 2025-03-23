import { stringify, uneval } from 'devalue';
import { getRequestEvent } from './event.js';

/**
 * @template {(formData: FormData) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function formAction(fn) {
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(fn, 'method', {
		value: 'POST',
		writable: false,
		enumerable: true,
		configurable: false
	});
	Object.defineProperty(fn, '__type', {
		value: 'formAction',
		writable: false,
		enumerable: true,
		configurable: false
	});
	let set = false;
	Object.defineProperty(fn, '_set_action', {
		/** @param {string} action */
		value: (action) => {
			if (set) return;
			set = true;
			Object.defineProperty(fn, 'action', {
				value: action,
				writable: false,
				enumerable: true,
				configurable: false
			});
		},
		writable: false,
		enumerable: true,
		configurable: false
	});
	return fn;
}

/**
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @returns {T}
 */
export function query(fn) {
	/** @param {...Parameters<T>} args */
	const wrapper = async (...args) => {
		// TODO don't do the additional work when we're being called from the client
		const event = getRequestEvent();
		const result = await fn(...args);
		const stringified_args = stringify(args, event._.transport);
		event._.remote_results[wrapper.__id + stringified_args] = uneval_remote_response(
			result,
			event._.transport
		);
		return result;
	};
	// Better safe than sorry: Seal these properties to prevent modification
	Object.defineProperty(wrapper, '__type', {
		value: 'query',
		writable: false,
		enumerable: true,
		configurable: false
	});
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
