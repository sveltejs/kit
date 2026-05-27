/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, query_map } from '../client.js';
import { get_remote_request_headers, QUERY_FUNCTION_ID, remote_request } from './shared.svelte.js';
import { QueryProxy } from './query/proxy.js';
import { query as query_client } from './query/index.js';
import * as devalue from 'devalue';
import { HttpError } from '@sveltejs/kit/internal';
import { unfriendly_hydratable } from '../../shared.js';

/**
 * @typedef {| { type: 'result'; arg: any; payload: string; data: any }
 *           | { type: 'error'; arg: any; payload: string; error: any; status: number }} FanOutEntry
 */

/**
 * @typedef {object} FanOutResponse
 * @property {string} item_query_id
 * @property {Array<FanOutEntry>} items
 * @property {Record<string, any>} meta
 */

/**
 * @param {string} id
 * @returns {RemoteQueryFunction<any, any>}
 */
export function query_fan_out(id) {
	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, arg, async (key, payload) => {
			const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

			const serialized = await unfriendly_hydratable(key, () =>
				remote_request(url, get_remote_request_headers())
			);

			const { item_query_id, items, meta } = /** @type {FanOutResponse} */ (
				devalue.parse(serialized, app.decoders)
			);

			// Construct the per-item stub once per fan-out call. This is
			// the same factory the Vite client transform would produce for
			// a direct `item_query(arg)` call, so item proxies created
			// here share the same per-id cache map and identity as direct
			// calls — meaning a subsequent `item_query(arg)` elsewhere on
			// the page reuses this warmed value with no extra HTTP request.
			const item_factory = query_client(item_query_id);

			const rows = items.map((entry) => {
				const proxy = item_factory(entry.arg);

				// Constructing the proxy populates `query_map[item_query_id]`
				// via `cache.ensure_entry` and runs the resource factory
				// inside `$effect.root`, so the cache entry always exists
				// at this point. Reach through directly rather than going
				// via the public `QueryProxy.set` (which we use anyway for
				// success rows) so we can also surface per-row errors via
				// `Query.fail`, which is internal to kit.
				const cached = /** @type {NonNullable<ReturnType<typeof query_map.get>>} */ (
					query_map.get(item_query_id)
				).get(entry.payload);

				if (!cached) {
					// Should be unreachable; the proxy constructor above
					// always populates the cache entry. Fall through and
					// let the proxy fetch normally if this ever happens.
					return proxy;
				}

				if (entry.type === 'result') {
					cached.resource.set(entry.data);
				} else {
					cached.resource.fail(new HttpError(entry.status, entry.error));
				}

				return proxy;
			});

			return { ...meta, rows };
		});
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}
