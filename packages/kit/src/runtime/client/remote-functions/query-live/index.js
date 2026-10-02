/** @import { RemoteLiveQuery, RemoteLiveQueryFunction } from '@sveltejs/kit' */
import { live_query_map } from '../../client.js';
import { QUERY_FUNCTION_ID } from '../shared.svelte.js';
import { DEV } from 'esm-env';
import { LiveQueryProxy } from './proxy.js';

export { LiveQueryProxy };

/**
 * @param {string} id
 * @returns {RemoteLiveQueryFunction<any, any>}
 */
export function query_live(id) {
	if (DEV) {
		// If this reruns as part of HMR, reconnect all live entries.
		const entries = live_query_map.get(id);

		if (entries) {
			for (const { resource } of entries.values()) {
				void resource.reconnect();
			}
		}
	}

	/** @type {RemoteLiveQueryFunction<any, any>} */
	const wrapper = (arg) => /** @type {RemoteLiveQuery<any>} */ (new LiveQueryProxy(id, arg));

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
