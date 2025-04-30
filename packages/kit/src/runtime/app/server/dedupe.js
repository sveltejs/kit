import { getRequestEvent } from './event.js';
import { deep_equal } from './deep_equal.js';

/**
 * Internal function to find a function call in the cache.
 * @param {Array<Array<any>>} cache_usages - All the cache usages in the request.
 * @param {Array<any>} arg_array - The arguments to find.
 * @returns The function call and the index of the cache usage, or undefined if not found.
 */
function find(cache_usages, arg_array) {
	for (let i = 0; i < cache_usages.length; i++) {
		const usage = cache_usages[i];
		if (usage.length !== arg_array.length + 1) {
			continue;
		}
		let j = 1;
		for (; j < usage.length; j++) {
			if (!deep_equal(usage[j], arg_array[j - 1])) {
				break;
			}
		}
		if (j === usage.length) {
			return [usage[0], i];
		}
	}
}

const underlying_fn = Symbol('underlyingFn');

/**
 * Gets the underlying function that was turned into a proxy.
 * @template {(...args: any[]) => any} F
 * @param {F} fn - The function to get the underlying function from.
 * @returns {F} The underlying function.
 */
export function getUnderlyingFunction(fn) {
	// @ts-expect-error: This is a magic value
	return fn[underlying_fn] || fn;
}

/**
 * Creates a deduplicated function. This means that within a request, if multiple
 * calls are made with the same arguments, the underlying function will only be
 * called once and the result will be cached and returned for all subsequent calls.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn - The function to deduplicate.
 * @returns {F} The deduplicated function.
 */
export function dedupe(fn) {
	// @ts-expect-error: Our internal magic value
	if (fn[underlying_fn] === fn) {
		throw new Error('Cannot dedupe a function that is already deduplicated');
	}
	return new Proxy(fn, {
		get(target, prop, receiver) {
			if (prop === underlying_fn) {
				// Magic value to get the underlying function
				return target;
			}

			return Reflect.get(target, prop, receiver);
		},
		apply(target, this_arg, arg_array) {
			const ev = getRequestEvent();
			if (!ev) {
				// No active Svelte request, so we can't dedupe
				return Reflect.apply(target, this_arg, arg_array);
			}

			// Find our cache for this function
			// @ts-expect-error: We are accessing the private _values property
			let values = ev.dedupe._values.get(target);
			if (!values) {
				values = [];
				// @ts-expect-error: We are accessing the private _values property
				ev.dedupe._values.set(target, values);
			}

			// Check if we have a cached result for these arguments
			const res = find(values, arg_array);
			if (res) {
				return res[0];
			}

			// Call the function and cache the result
			const result = Reflect.apply(target, this_arg, arg_array);
			arg_array.unshift(result);
			values.push(arg_array);
			return result;
		}
	});
}

/** Defines the cache of functions for this request. */
export class DedupeCache {
	constructor() {
		/** @private */
		this._values = new Map();
	}

	/**
	 * Check if a given function call is cached.
	 * @template {(...args: any[]) => any} F
	 * @param {F} fn - The function to check.
	 * @param {Parameters<F>} args - The arguments to check.
	 * @returns {boolean} - Whether the function call is cached.
	 */
	has(fn, ...args) {
		const items = this._values.get(fn);
		if (!items) {
			return false;
		}
		return !!find(items, args);
	}

	/**
	 * Remove a function call from the cache.
	 * @template {(...args: any[]) => any} F
	 * @param {F} fn - The function to remove.
	 * @param {Parameters<F>} args - The arguments to remove.
	 * @returns {boolean} - Whether the function call was removed.
	 */
	remove(fn, ...args) {
		const items = this._values.get(fn);
		if (!items) {
			return false;
		}
		const res = find(items, args);
		if (!res) {
			return false;
		}
		items.splice(res[1], 1);
		return true;
	}
}
