import { live_query_map } from '../../client.js';
import { on_remote_refresh, on_remote_reset } from '#internal/remote-env';
import { noop } from '../../../../utils/functions.js';
import { CacheController } from '../cache.svelte.js';

export const cache = new CacheController(live_query_map, (resource) => resource.destroy());

on_remote_reset(cache.clear);

on_remote_refresh(async () => {
	/** @type {Promise<void>[]} */
	const reconnects = [];

	for (const entries of live_query_map.values()) {
		for (const { resource } of entries.values()) {
			// a failed reconnect shows up as the live query's `error`, as in `refreshAll()`
			reconnects.push(resource.reconnect().catch(noop));
		}
	}

	await Promise.all(reconnects);
});
