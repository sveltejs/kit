/** @import { RemoteQueryFunction } from '$app/server' */
import { app_dir, base } from '#app/paths';
import { _goto, query_map } from '../../client.js';
import { QUERY_FUNCTION_ID, remote_request, unwrap_node } from '../shared.svelte.js';
import { DEV } from 'esm-env';
import { QueryProxy } from './proxy.js';
import { create_remote_key } from '../../../shared.js';

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query(id) {
	if (DEV) {
		// If this reruns as part of HMR, refresh all live entries.
		const entries = query_map.get(id);

		if (entries) {
			for (const { resource } of entries.values()) {
				void resource.refresh();
			}
		}
	}

	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, arg, async (payload) => {
			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			const key = create_remote_key(id, payload);

			// return the result rather than having `remote_request` apply it via `set`,
			// so that `Query` can discard a response that a newer one has superseded
			const result = await remote_request(url, undefined, null, key);

			if (result.redirect) {
				// Use internal version to allow redirects to external URLs
				await _goto(result.redirect);
			}

			// the query's own entry wins if the query updated itself via `set` or `refresh`
			if (result.q && Object.hasOwn(result.q, key)) {
				return unwrap_node(result.q[key]);
			}

			return result._;
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
