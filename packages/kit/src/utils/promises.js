import { DEV } from 'esm-env';

let warned_top_level_promise_property = false;

/**
 * Given an object, return a new object where all top level values are awaited
 *
 * @param {Record<string, any>} object
 * @param {string | null} [route_id]
 * @returns {Promise<Record<string, any>>}
 */
export async function unwrap_promises(object, route_id) {
	for (const key in object) {
		if (typeof object[key]?.then === 'function') {
			// TODO v2: remove this warning and all references to unwrap_promises
			if (DEV && !warned_top_level_promise_property) {
				console.warn(
					'Top level promises returned from load will not be automatically awaited in SvelteKit v2. To get rid of this warning, await the promise before returning it.',
					route_id ? `(key: ${key} from route ${route_id})` : ''
				);

				warned_top_level_promise_property = true;
			}
			return Object.fromEntries(
				await Promise.all(Object.entries(object).map(async ([key, value]) => [key, await value]))
			);
		}
	}

	return object;
}
