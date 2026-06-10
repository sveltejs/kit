/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { goto, query_map } from '../../client.js';
import { get_remote_request_headers, QUERY_FUNCTION_ID, remote_request } from '../shared.svelte.js';
import { DEV } from 'esm-env';
import { QueryProxy } from './proxy.js';

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

			const result = await remote_request(url, { headers: get_remote_request_headers() });

			if (result.redirect) {
				await goto(result.redirect);
			}
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
