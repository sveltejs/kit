/** @import { RemoteQueryFunction } from '@sveltejs/kit' */
import { app_dir, base } from '$app/paths/internal/client';
import { app, query_map, query_responses } from '../../client.js';
import {
	apply_queries,
	create_remote_pointer_reviver,
	get_remote_request_headers,
	QUERY_FUNCTION_ID,
	register_pointer_reviver,
	remote_response,
	revive_remote_value
} from '../shared.svelte.js';
import { DEV } from 'esm-env';
import {
	parse_remote_value,
	stringify_remote_arg,
	unfriendly_hydratable
} from '../../../shared.js';
import { QueryProxy } from './proxy.js';

/**
 * Creates the fetcher used by a {@link QueryProxy} to resolve a query's value: first from the
 * universal-load hydration payload (first render only), then from the render-time
 * `hydratable` cache, and finally from the network. When fetched over the network, the
 * response's `queries` side-channel is applied so that nested resources are seeded.
 *
 * @param {string} id
 * @param {() => void} [on_network] called when an actual network request is made — used to
 *   warn (in dev) when a *revived* nested pointer wasn't seeded and has to fetch
 * @returns {(key: string, payload: string) => Promise<any>}
 */
function create_query_fetcher(id, on_network) {
	return (key, payload) => {
		// universal-load seed (first render only)
		if (Object.hasOwn(query_responses, key)) {
			const serialized = query_responses[key];
			delete query_responses[key];
			return Promise.resolve(revive_remote_value(serialized));
		}

		const url = `${base}/${app_dir}/remote/${id}${payload ? `?payload=${payload}` : ''}`;

		/** @type {((pointer: [string, string, 'q' | 'b' | 'p']) => any) | undefined} */
		let revive;

		const hydrated = unfriendly_hydratable(key, async () => {
			on_network?.();
			const resolved = await remote_response(url, get_remote_request_headers());
			revive = apply_queries(resolved.queries);
			return resolved.result;
		});

		// Hydration served the value synchronously (always a string). Parse it *now*, so that
		// reviving nested pointers reads their own hydratable seeds within the same synchronous
		// hydration window — a later (awaited) read would miss Svelte's hydratable cache.
		if (typeof hydrated === 'string') {
			return Promise.resolve(
				parse_remote_value(hydrated, app.decoders, create_remote_pointer_reviver())
			);
		}

		// Otherwise we're fetching: `hydrated` is the request promise.
		return Promise.resolve(hydrated).then((serialized) =>
			parse_remote_value(serialized, app.decoders, revive ?? create_remote_pointer_reviver())
		);
	};
}

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

	const fetcher = create_query_fetcher(id);

	/** @type {RemoteQueryFunction<any, any>} */
	const wrapper = (arg) => {
		return new QueryProxy(id, stringify_remote_arg(arg, app.hooks.transport), fetcher);
	};

	Object.defineProperty(wrapper, QUERY_FUNCTION_ID, { value: id });

	return wrapper;
}

// Revive `[id, payload, 'q']` pointers (nested `query` results) into a QueryProxy. When the
// value wasn't seeded, fetching it on use warns in dev.
register_pointer_reviver(
	'q',
	(id, payload, initial) =>
		new QueryProxy(
			id,
			payload,
			create_query_fetcher(id, initial ? undefined : () => warn_unseeded(id, payload)),
			initial
		)
);

/**
 * @param {string} id
 * @param {string} payload
 */
function warn_unseeded(id, payload) {
	if (DEV) {
		console.warn(
			`A nested query (${id}${payload ? ` with payload ${payload}` : ''}) was used on the client ` +
				`but its value wasn't serialized during SSR, so it had to be fetched. To avoid the extra ` +
				`request, make sure the query is awaited/read wherever it's returned.`
		);
	}
}
