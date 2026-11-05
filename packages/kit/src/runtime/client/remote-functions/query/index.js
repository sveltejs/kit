/** @import { RemoteQueryFunction } from '$app/server' */
import { app_dir, base } from '#app/paths';
import { _goto, query_map } from '../../client.js';
import { QUERY_FUNCTION_ID, remote_request } from '../shared.svelte.js';
import { DEV } from 'esm-env';
import { QueryProxy } from './proxy.js';
import { noop } from '../../../../utils/functions.js';

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

			const result = await remote_request(url);

			if (result.redirect) {
				// Use internal version to allow redirects to external URLs. Don't await it here,
				// since the query may be blocking the component update that completes the navigation.
				void _goto(result.redirect).catch(noop);
			}
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
