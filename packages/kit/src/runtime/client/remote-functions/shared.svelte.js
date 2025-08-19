/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { tick } from 'svelte';
import { create_remote_cache_key, stringify_remote_arg } from '../../shared.js';

/**
 *
 * @param {string} url
 */
export async function remote_request(url) {
	const response = await fetch(url);

	if (!response.ok) {
		throw new HttpError(500, 'Failed to execute remote function');
	}

	const result = /** @type {RemoteFunctionResponse} */ (await response.json());

	if (result.type === 'redirect') {
		// resource_cache.delete(cache_key);
		// version++;
		// await goto(result.location);
		// /** @type {Query<any>} */ (resource).refresh();
		// TODO double-check this
		await goto(result.location);
		await new Promise((r) => setTimeout(r, 100));
		throw new Redirect(307, result.location);
	}

	if (result.type === 'error') {
		throw new HttpError(result.status ?? 500, result.error);
	}

	return devalue.parse(result.result, app.decoders);
}

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {(key: string, args: string) => any} create
 */
export function create_remote_function(id, create) {
	return (/** @type {any} */ arg) => {
		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_cache_key(id, payload);
		let entry = query_map.get(cache_key);

		let tracking = true;
		try {
			$effect.pre(() => {
				if (entry) entry.count++;
				return () => {
					const entry = query_map.get(cache_key);
					if (entry) {
						entry.count--;
						void tick().then(() => {
							if (!entry.count && entry === query_map.get(cache_key)) {
								query_map.delete(cache_key);
							}
						});
					}
				};
			});
		} catch {
			tracking = false;
		}

		let resource = entry?.resource;
		if (!resource) {
			resource = create(cache_key, payload);

			Object.defineProperty(resource, '_key', {
				value: cache_key
			});

			query_map.set(
				cache_key,
				(entry = {
					count: tracking ? 1 : 0,
					resource
				})
			);

			resource
				.then(() => {
					void tick().then(() => {
						if (
							!(/** @type {NonNullable<typeof entry>} */ (entry).count) &&
							entry === query_map.get(cache_key)
						) {
							// If no one is tracking this resource anymore, we can delete it from the cache
							query_map.delete(cache_key);
						}
					});
				})
				.catch(() => {
					// error delete the resource from the cache
					// TODO is that correct?
					query_map.delete(cache_key);
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
		const entry = query_map.get(key);
		entry?.resource.set(value);
	}
}
