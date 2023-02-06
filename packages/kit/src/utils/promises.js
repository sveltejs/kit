import { Deferred } from '../runtime/control.js';

/**
 * Given an object, return a new object where all top level values are awaited
 *
 * @param {Record<string, any> | Deferred<Record<string, any>>} object
 * @returns {Promise<Record<string, any>>}
 */
export async function unwrap_promises(object) {
	if (object instanceof Deferred) {
		return object.data;
	}

	for (const key in object) {
		if (typeof object[key]?.then === 'function') {
			return Object.fromEntries(
				await Promise.all(Object.entries(object).map(async ([key, value]) => [key, await value]))
			);
		}
	}

	return object;
}
