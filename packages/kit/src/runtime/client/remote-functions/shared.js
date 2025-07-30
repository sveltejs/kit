/** @import { Query } from './remote.svelte.js' */
/** @import { RemoteFunctionResponse } from 'types' */
import * as devalue from 'devalue';
import { app, goto, invalidateAll, query_map } from '../client.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';

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
 * @param {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} updates
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
 * @param {Array<Query<any> | ReturnType<Query<any>['withOverride']>>} updates
 */
export function refresh_queries(stringified_refreshes, updates = []) {
	const refreshes = Object.entries(devalue.parse(stringified_refreshes, app.decoders));
	if (refreshes.length > 0) {
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
	} else {
		void invalidateAll();
	}
}
