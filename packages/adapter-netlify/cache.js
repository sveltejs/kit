import { purgeCache } from '@netlify/functions';

const CACHE_NAME = 'sveltekit-remote-functions'; // TODO should this be configurable/different per deployment?

/** @type {Promise<any> | null} */
let runtime_cache = null;

/**
 * @returns {Promise<any> | null}
 */
function get_runtime_cache() {
	const cache_storage = /** @type {any} */ (globalThis).caches;
	if (!cache_storage) return null;

	runtime_cache ??= cache_storage.open(CACHE_NAME);
	return runtime_cache;
}

/**
 * @param {string} query_id
 */
function get_cache_key(query_id) {
	return `https://sveltekit.remote/${encodeURIComponent(query_id)}`;
}

/**
 * @typedef {{ maxAge: number; staleWhileRevalidate?: number; tags: string[] }} KitCacheOptions
 */

/**
 * @param {KitCacheOptions} cache
 */
function create_cache_control(cache) {
	const value = ['public', 'durable', `max-age=${Math.floor(cache.maxAge)}`];

	if (cache.staleWhileRevalidate && cache.staleWhileRevalidate > 0) {
		value.push(`stale-while-revalidate=${Math.floor(cache.staleWhileRevalidate)}`);
	}

	return value.join(', ');
}

/** @returns {import('@sveltejs/kit').KitCacheHandler} */
export default function create_cache() {
	return {
		async get(query_id) {
			const cache = await get_runtime_cache();
			if (!cache) return undefined;

			const response = await cache.match(get_cache_key(query_id));
			if (!response) return undefined;

			const value = await response.text();
			if (typeof value === 'string') {
				return value;
			}

			return undefined;
		},

		async set(query_id, stringified_response, cache) {
			const runtime_cache = await get_runtime_cache();
			if (!runtime_cache) return;

			const key = get_cache_key(query_id);

			if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
				await runtime_cache.delete(key);
				return;
			}

			const tags = cache.tags.filter(Boolean);
			const netlify_cache_control = create_cache_control(cache);
			const headers = new Headers({
				'Netlify-CDN-Cache-Control': netlify_cache_control
			});

			if (tags.length > 0) {
				const value = tags.join(',');
				headers.set('Netlify-Cache-Tag', value);
			}

			await runtime_cache.put(key, new Response(stringified_response, { headers }));
		},

		setHeaders(/** @type {Headers} */ headers, /** @type {KitCacheOptions} */ cache) {
			const tags = cache.tags.filter(Boolean);

			headers.set('Netlify-CDN-Cache-Control', create_cache_control(cache));

			if (tags.length > 0) {
				const value = tags.join(',');
				headers.set('Netlify-Cache-Tag', value);
			}
		},

		async invalidate(/** @type {string[]} */ tags) {
			const filtered = tags.filter(Boolean);
			if (filtered.length === 0) return;

			await purgeCache({ tags: filtered });
		}
	};
}
