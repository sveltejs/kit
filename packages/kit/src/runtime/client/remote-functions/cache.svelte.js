import { tick } from 'svelte';

/**
 * @template R
 * @typedef {object} CacheEntry
 * @property {number} proxy_count The number of live proxy instances referencing this
 *   entry. The entry is eligible for eviction when this hits zero.
 * @property {R} resource The actual reactive resource (Query or LiveQuery).
 * @property {() => void} cleanup Tears down the `$effect.root` that owns the resource.
 *   Run when the entry is evicted.
 */

/**
 * @template R
 * @typedef {{ entry: CacheEntry<R>, id: string, payload: string }} ProxyFinalizerToken
 */

/**
 * Cache controller bound to a specific cache map and resource teardown function. Owns the
 * eviction scheduling and FinalizationRegistry for its cache.
 *
 * Methods are defined as arrow-function class fields so they can be destructured and
 * re-exported without losing their `this` binding.
 *
 * @template R
 */
export class CacheController {
	/** @type {Map<string, Map<string, CacheEntry<R>>>} */
	#cache_map;

	/** @type {((resource: R) => void) | undefined} */
	#destroy_resource;

	/**
	 * The held value points at the cache entry the proxy is contributing to. When the
	 * proxy is GC'd, we decrement that entry's `proxy_count` and schedule a deferred
	 * eviction check.
	 *
	 * @type {FinalizationRegistry<ProxyFinalizerToken<R>>}
	 */
	#proxy_finalizer = new FinalizationRegistry(({ entry, id, payload }) => {
		this.deref(entry, id, payload);
	});

	/**
	 * @param {Map<string, Map<string, CacheEntry<R>>>} cache_map
	 * @param {(resource: R) => void} [destroy_resource] Optional teardown hook called on
	 *   the resource itself before the cache entry's `$effect.root` cleanup runs. Used by
	 *   live queries to detach event listeners and abort connections.
	 */
	constructor(cache_map, destroy_resource) {
		this.#cache_map = cache_map;
		this.#destroy_resource = destroy_resource;
	}

	/**
	 * Get-or-create the cache entry for `(id, payload)`. The resource is constructed
	 * inside an `$effect.root`, the cleanup of which is stored on the entry.
	 *
	 * @param {string} id
	 * @param {string} payload
	 * @param {() => R} create_resource
	 * @returns {CacheEntry<R>}
	 */
	ensure_entry = (id, payload, create_resource) => {
		let entries = this.#cache_map.get(id);

		if (!entries) {
			entries = new Map();
			this.#cache_map.set(id, entries);
		}

		let entry = entries.get(payload);

		if (!entry) {
			const c = /** @type {CacheEntry<R>} */ ({
				proxy_count: 0,
				resource: /** @type {R} */ (/** @type {unknown} */ (null)),
				cleanup: /** @type {() => void} */ (/** @type {unknown} */ (null))
			});

			c.cleanup = $effect.root(() => {
				c.resource = create_resource();
			});

			entry = c;
			entries.set(payload, entry);
		}

		return entry;
	};

	/**
	 * Register a reference to a resource cache entry using an anchor object with the FinalizationRegistry.
	 * When the anchor object is garbage collected, the held value's `entry.proxy_count` is decremented
	 * and a deferred eviction check is scheduled for `(id, payload)`.
	 *
	 * @param {object} anchor
	 * @param {CacheEntry<R>} entry
	 * @param {string} id
	 * @param {string} payload
	 */
	ref = (anchor, entry, id, payload) => {
		entry.proxy_count++;
		this.#proxy_finalizer.register(anchor, { entry, id, payload });
	};

	/**
	 * Manually reference this cache entry. Danger: This entry will never be cleaned up unless the returned callback is called.
	 *
	 * @param {CacheEntry<R>} entry
	 * @param {string} id
	 * @param {string} payload
	 */
	manual_ref = (entry, id, payload) => {
		entry.proxy_count++;
		return () => this.deref(entry, id, payload);
	};

	/**
	 * Dereference this cache entry. If the entry's `proxy_count` hits zero, schedule a deferred eviction check.
	 *
	 * @param {CacheEntry<R>} entry
	 * @param {string} id
	 * @param {string} payload
	 */
	deref = (entry, id, payload) => {
		entry.proxy_count--;
		void tick().then(() => {
			const entry = this.#cache_map.get(id)?.get(payload);
			if (!entry || entry.proxy_count > 0) return;
			this.#evict(id, payload);
		});
	};

	/**
	 * Tear down the cache entry for `(id, payload)` if it exists. Runs the optional
	 * resource teardown and the entry's `$effect.root` cleanup, then removes the entry
	 * from the cache map.
	 *
	 * @param {string} id
	 * @param {string} payload
	 */
	#evict = (id, payload) => {
		const entries = this.#cache_map.get(id);
		const entry = entries?.get(payload);
		if (!entry) return;

		this.#destroy_resource?.(entry.resource);
		entry.cleanup();
		entries?.delete(payload);
		if (entries && entries.size === 0) {
			this.#cache_map.delete(id);
		}
	};
}
