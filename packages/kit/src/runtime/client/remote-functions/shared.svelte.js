/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto, query_map, remote_responses } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { create_remote_key, stringify_remote_arg } from '../../shared.js';

/**
 *
 * @param {string} url
 */
export async function remote_request(url) {
	const response = await fetch(url, {
		headers: {
			// TODO in future, when we support forking, we will likely need
			// to grab this from context as queries will run before
			// `location.pathname` is updated
			'x-sveltekit-pathname': location.pathname,
			'x-sveltekit-search': location.search
		}
	});

	if (!response.ok) {
		throw new HttpError(500, 'Failed to execute remote function');
	}

	const result = /** @type {RemoteFunctionResponse} */ (await response.json());

	if (result.type === 'redirect') {
		await goto(result.location);
		throw new Redirect(307, result.location);
	}

	if (result.type === 'error') {
		throw new HttpError(result.status ?? 500, result.error);
	}

	return result.result;
}

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @template {Promise<any> & { set?: any, refresh?: any }} T
 * @param {string} id
 * @param {(key: string, args: string) => T} create
 * @return {(arg: any) => T}
 */
export function create_remote_function(id, create) {
	return (/** @type {any} */ arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_key(id, payload);
		let entry = query_map.get(cache_key);
		let resource = /** @type {T | undefined} */ (entry?.deref());

		if (!resource) {
			resource = create(cache_key, payload);

			// Delete the hydrated response from the cache at this point:
			// If this instance is no longer referenced anywhere in the app,
			// a new instance should not use the cached response, as it may be stale.
			delete remote_responses[cache_key];

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			Object.defineProperty(resource, '_key', {
				value: cache_key
			});

			entry = new WeakRef(resource);

			query_map.set(cache_key, entry);

			resource.catch(() => {
				if (entry === query_map.get(cache_key)) {
					// error delete the resource from the cache
					// TODO is that correct?
					query_map.delete(cache_key);
				}
			});
		}

		return resource;
	};
}

/**
 * @param {Array<Query<any> | RemoteQueryOverride>} updates
 */
export function release_overrides(updates) {
	for (const update of updates) {
		if ('release' in update) {
			update.release();
		}
	}
}

/**
 * @param {string} stringified_refreshes
 * @param {Array<Query<any> | RemoteQueryOverride>} updates
 */
export function refresh_queries(stringified_refreshes, updates = []) {
	const refreshes = Object.entries(devalue.parse(stringified_refreshes, app.decoders));

	// `refreshes` is a superset of `updates`
	for (const [key, value] of refreshes) {
		// If there was an optimistic update, release it right before we update the query
		const update = updates.find((u) => u._key === key);
		if (update && 'release' in update) {
			update.release();
		}
		// Update the query with the new value
		const resource = query_map.get(key)?.deref();
		resource?.set(value);
	}
}
