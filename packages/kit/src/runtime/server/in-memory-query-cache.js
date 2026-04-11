// Simple Standalone in-memory cache implementation for remote query responses.
// Used at dev and preview time.

/**
 * @typedef {{ maxAge: number; tags: string[]; staleWhileRevalidate?: number }} QueryCacheMetadata
 */

/**
 * @typedef {{ expires: number; stale_expires: number; value: string }} QueryCacheEntry
 */

/**
 * @returns {import('types').KitCacheHandler}
 */
export default function create_in_memory_query_cache() {
	/** @type {Map<string, QueryCacheEntry>} */
	const entries = new Map();

	/** @type {Map<string, Set<string>>} */
	const tag_to_keys = new Map();

	/** @type {Map<string, Set<string>>} */
	const key_to_tags = new Map();

	return {
		async get(query_id) {
			const now = Date.now();
			const hit = entries.get(query_id);

			if (!hit) return undefined;

			if (hit.stale_expires <= now) {
				entries.delete(query_id);
				remove_key_from_tag_index(tag_to_keys, key_to_tags, query_id);
				return undefined;
			}

			return hit.value;
		},

		async set(query_id, stringified_response, cache) {
			if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
				entries.delete(query_id);
				remove_key_from_tag_index(tag_to_keys, key_to_tags, query_id);
				return;
			}

			const stale_while_revalidate =
				cache.staleWhileRevalidate !== undefined && cache.staleWhileRevalidate > 0
					? cache.staleWhileRevalidate
					: 0;

			const tags = cache.tags.filter(Boolean);
			const now = Date.now();

			remove_key_from_tag_index(tag_to_keys, key_to_tags, query_id);

			entries.set(query_id, {
				expires: now + cache.maxAge * 1000,
				stale_expires: now + (cache.maxAge + stale_while_revalidate) * 1000,
				value: stringified_response
			});

			for (const tag of tags) {
				let keys = tag_to_keys.get(tag);
				if (!keys) {
					keys = new Set();
					tag_to_keys.set(tag, keys);
				}
				keys.add(query_id);
			}

			if (tags.length > 0) {
				key_to_tags.set(query_id, new Set(tags));
			}
		},

		async invalidate(tags) {
			for (const tag of tags) {
				const keys = tag_to_keys.get(tag);
				if (!keys) continue;

				for (const key of [...keys]) {
					entries.delete(key);
					remove_key_from_tag_index(tag_to_keys, key_to_tags, key);
				}
			}
		}
	};
}

/**
 * @param {Map<string, Set<string>>} tag_to_keys
 * @param {Map<string, Set<string>>} key_to_tags
 * @param {string} key
 */
function remove_key_from_tag_index(tag_to_keys, key_to_tags, key) {
	const tags = key_to_tags.get(key);
	if (!tags) return;

	for (const tag of tags) {
		const keys = tag_to_keys.get(tag);
		if (!keys) continue;
		keys.delete(key);
		if (keys.size === 0) {
			tag_to_keys.delete(tag);
		}
	}

	key_to_tags.delete(key);
}
