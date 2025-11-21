/** @import { RemoteQueryOverride } from '@sveltejs/kit' */
/** @import { RemoteFunctionResponse } from 'types' */
/** @import { Query } from './query.svelte.js' */
import * as devalue from 'devalue';
import { app, goto, redirect_fork, query_map, remote_responses } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { getContext, tick } from 'svelte';
import { create_remote_key, stringify_remote_arg } from '../../shared.js';

/**
 *
 * @param {string} url
 * @param {Map<import('svelte').Fork | undefined, number>} forks
 */
export async function remote_request(url, forks = new Map()) {
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
		if (
			forks.size === 0 ||
			Array.from(forks.keys()).some(
				(fork) =>
					!fork ||
					!fork.isDiscarded || // isDiscarded et al was introduced later, do this for backwards compatibility
					fork.isCommitted()
			)
		) {
			// If this query is used in at least one non-forked context,
			// it means it's part of the current world, therefore perform a regular redirect
			await goto(result.location);
		} else {
			for (const fork of /** @type {MapIterator<import('svelte').Fork>} */ (forks.keys())) {
				if (!fork.isDiscarded()) {
					redirect_fork(fork, result.location);
					break; // there can only be one current fork
				}
			}
		}

		throw new Redirect(307, result.location);
	}

	if (result.type === 'error') {
		throw new HttpError(result.status ?? 500, result.error);
	}

	return result.result;
}

/**
 * Client-version of the `query`/`prerender`/`cache` function from `$app/server`.
 * @param {string} id
 * @param {(key: string, args: string, forks: Map<import('svelte').Fork | undefined, number>) => any} create
 */
export function create_remote_function(id, create) {
	return (/** @type {any} */ arg) => {
		/** @type {import('svelte').Fork | undefined} */
		let fork = undefined;
		try {
			fork = getContext('__sveltekit_fork')?.();
		} catch {
			// not called in a reactive context
		}

		const payload = stringify_remote_arg(arg, app.hooks.transport);
		const cache_key = create_remote_key(id, payload);
		let entry = query_map.get(cache_key);

		let tracking = true;
		try {
			$effect.pre(() => {
				if (entry) {
					entry.count++;
					entry.forks.set(fork, (entry.forks.get(fork) ?? 0) + 1);
				}
				return () => {
					const entry = query_map.get(cache_key);
					if (entry) {
						entry.count--;

						const fork_count = /** @type {number} */ (entry.forks.get(fork)) - 1;
						if (fork_count === 0) {
							entry.forks.delete(fork);
						} else {
							entry.forks.set(fork, fork_count);
						}

						void tick().then(() => {
							if (!entry.count && entry === query_map.get(cache_key)) {
								query_map.delete(cache_key);
								delete remote_responses[cache_key];
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
			const forks = new Map([[fork, 1]]);
			resource = create(cache_key, payload, forks);

			Object.defineProperty(resource, '_key', {
				value: cache_key
			});

			query_map.set(
				cache_key,
				(entry = {
					count: tracking ? 1 : 0,
					forks,
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
