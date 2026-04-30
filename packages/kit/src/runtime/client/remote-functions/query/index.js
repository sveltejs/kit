/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, query_map, query_responses } from '../../client.js';
import { get_remote_request_headers, QUERY_FUNCTION_ID, remote_request } from '../shared.svelte.js';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { unfriendly_hydratable } from '../../../shared.js';
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
		return new QueryProxy(id, arg, async (key, payload) => {
			if (Object.hasOwn(query_responses, key)) {
				const value = query_responses[key];
				delete query_responses[key];
				return value;
			}

			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			const serialized = await unfriendly_hydratable(key, () =>
				remote_request(url, get_remote_request_headers())
			);

			return devalue.parse(serialized, app.decoders);
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
