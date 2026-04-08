/**
 * In-memory runtime cache for responses that carry {@link https://developers.cloudflare.com/cache/how-to/cache-tags/ Cache-Tag}
 * and `CDN-Cache-Control` from SvelteKit's public cache directive. Used by the Node adapter and Vite dev/preview servers.
 */

import { SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER } from '../shared.js';

// TODO this is all backwards
/**
 * Parse `max-age` from `CDN-Cache-Control`.
 * @param {Headers} headers
 * @returns {number} max-age in seconds, or 0
 */
export function max_age_from_headers(headers) {
	const raw = headers.get('CDN-Cache-Control') || '';
	const m = /max-age=(\d+)/i.exec(raw);
	return m ? parseInt(m[1], 10) : 0;
}

/**
 * Parse `stale-while-revalidate` from `CDN-Cache-Control`.
 * @param {Headers} headers
 * @returns {number} seconds, or 0
 */
function swr_from_headers(headers) {
	const raw = headers.get('CDN-Cache-Control') || '';
	const m = /stale-while-revalidate=(\d+)/i.exec(raw);
	return m ? parseInt(m[1], 10) : 0;
}

/**
 * Remove `key` from the tag index (all tag sets and the reverse map).
 * Does not remove `key` from the response map; callers do that when needed.
 *
 * @param {Map<string, Set<string>>} tag_to_keys
 * @param {Map<string, Set<string>>} key_to_tags
 * @param {string} key
 */
function unregister_cache_key(tag_to_keys, key_to_tags, key) {
	const tags = key_to_tags.get(key);
	if (!tags) return;

	for (const tag of tags) {
		const keys = tag_to_keys.get(tag);
		if (keys) {
			keys.delete(key);
			if (keys.size === 0) {
				tag_to_keys.delete(tag);
			}
		}
	}

	key_to_tags.delete(key);
}

/**
 * @param {Response} res
 * @param {Map<string, { expires: number; stale_expires: number; response: Response }>} response_cache
 * @param {Map<string, Set<string>>} tag_to_keys
 * @param {Map<string, Set<string>>} key_to_tags
 */
function process_invalidations(res, response_cache, tag_to_keys, key_to_tags) {
	const raw = res.headers.get(SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER);
	if (!raw) return;

	const tags = raw
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	for (const tag of tags) {
		const keys = tag_to_keys.get(tag);
		if (!keys) continue;

		for (const key of [...keys]) {
			response_cache.delete(key);
			unregister_cache_key(tag_to_keys, key_to_tags, key);
		}
	}
}

/**
 * @param {string} key
 * @param {Response} res
 * @param {Map<string, { expires: number; stale_expires: number; response: Response }>} response_cache
 * @param {Map<string, Set<string>>} tag_to_keys
 * @param {Map<string, Set<string>>} key_to_tags
 */
function store_if_cacheable(key, res, response_cache, tag_to_keys, key_to_tags) {
	const max_age = max_age_from_headers(res.headers);
	if (max_age <= 0 || !res.ok || res.status !== 200) return;

	const swr = swr_from_headers(res.headers);
	const raw_tags = res.headers.get('Cache-Tag') ?? '';
	const tags = raw_tags
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	unregister_cache_key(tag_to_keys, key_to_tags, key);

	const now = Date.now();
	response_cache.set(key, {
		expires: now + max_age * 1000,
		stale_expires: now + (max_age + swr) * 1000,
		response: res.clone()
	});

	for (const tag of tags) {
		let keys = tag_to_keys.get(tag);
		if (!keys) {
			keys = new Set();
			tag_to_keys.set(tag, keys);
		}
		keys.add(key);
	}

	if (tags.length > 0) {
		key_to_tags.set(key, new Set(tags));
	}
}

export class RuntimeCacheStore {
	/** @type {Map<string, { expires: number; stale_expires: number; response: Response }>} */
	#response_cache = new Map();

	/** @type {Map<string, Set<string>>} */
	#tag_to_keys = new Map();

	/** @type {Map<string, Set<string>>} */
	#key_to_tags = new Map();

	/** @type {Set<string>} */
	#revalidating = new Set();

	/**
	 * Drop every cached entry and tag index entry.
	 */
	clear() {
		this.#response_cache.clear();
		this.#tag_to_keys.clear();
		this.#key_to_tags.clear();
		this.#revalidating.clear();
	}

	/**
	 * Invalidate cached entries for the given tags (same semantics as tag invalidation from a response).
	 * @param {string[]} tags
	 */
	invalidate_tags(tags) {
		for (const tag of tags) {
			const keys = this.#tag_to_keys.get(tag);
			if (!keys) continue;
			for (const key of [...keys]) {
				this.#response_cache.delete(key);
				unregister_cache_key(this.#tag_to_keys, this.#key_to_tags, key);
			}
		}
	}

	/**
	 * @template {import('@sveltejs/kit').Server} Server
	 * @param {Parameters<Server['respond']>[0]} request
	 * @param {Parameters<Server['respond']>[1]} opts
	 * @param {Server} server
	 * @returns {Promise<Response>}
	 */
	async respond(request, opts, server) {
		const run = () => server.respond(request, opts);

		if (request.method !== 'GET' && request.method !== 'HEAD') {
			const res = await run();
			process_invalidations(res, this.#response_cache, this.#tag_to_keys, this.#key_to_tags);
			return res;
		}

		const key = request.url;
		const now = Date.now();
		const hit = this.#response_cache.get(key);

		if (hit) {
			if (hit.expires > now) {
				return hit.response.clone();
			}

			if (hit.stale_expires > now) {
				this.#revalidate(key, request, opts, server);
				return hit.response.clone();
			}
		}

		const res = await run();
		process_invalidations(res, this.#response_cache, this.#tag_to_keys, this.#key_to_tags);
		store_if_cacheable(key, res, this.#response_cache, this.#tag_to_keys, this.#key_to_tags);

		return res;
	}

	/**
	 * @template {import('@sveltejs/kit').Server} Server
	 * @param {string} key
	 * @param {Parameters<Server['respond']>[0]} request
	 * @param {Parameters<Server['respond']>[1]} opts
	 * @param {Server} server
	 */
	#revalidate(key, request, opts, server) {
		if (this.#revalidating.has(key)) return;
		this.#revalidating.add(key);

		server
			.respond(request.clone(), opts)
			.then((res) => {
				process_invalidations(res, this.#response_cache, this.#tag_to_keys, this.#key_to_tags);
				store_if_cacheable(key, res, this.#response_cache, this.#tag_to_keys, this.#key_to_tags);
			})
			.finally(() => {
				this.#revalidating.delete(key);
			});
	}
}

const default_runtime_cache_store = new RuntimeCacheStore();

/**
 * @template {import('@sveltejs/kit').Server} Server
 * @param {Parameters<Server['respond']>[0]} request
 * @param {Parameters<Server['respond']>[1]} opts
 * @param {Server} server
 * @returns {Promise<Response>}
 */
export function with_runtime_cache(request, opts, server) {
	return default_runtime_cache_store.respond(request, opts, server);
}
