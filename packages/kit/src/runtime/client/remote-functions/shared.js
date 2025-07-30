/** @import { Query } from './remote.svelte.js' */
import * as devalue from 'devalue';
import { app, invalidateAll, query_map } from '../client.js';

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
