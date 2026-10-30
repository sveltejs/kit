import { query_map } from '../../client.js';
import { on_remote_refresh, on_remote_reset } from '#internal/remote-env';
import { CacheController } from '../cache.svelte.js';

export const cache = new CacheController(query_map);

on_remote_reset(cache.clear);

on_remote_refresh(async () => {
	/** @type {Promise<void>[]} */
	const refreshes = [];

	for (const entries of query_map.values()) {
		for (const { resource } of entries.values()) {
			refreshes.push(resource.refresh());
		}
	}

	await Promise.all(refreshes);
});
