import { env } from 'cloudflare:workers';

const CACHE_NAME = 'sveltekit-remote-functions';

/** @type {Promise<Cache> | null} */
let runtime_cache = null;

/**
 * @returns {Promise<Cache> | null}
 */
function get_runtime_cache() {
	const cache_storage = /** @type {CacheStorage | undefined} */ (
		/** @type {any} */ (globalThis).caches
	);
	if (!cache_storage) return null;

	runtime_cache ??= cache_storage.open(CACHE_NAME);
	return runtime_cache;
}

/**
 * @param {string} query_id
 */
function get_cache_key(query_id) {
	return `https://sveltekit.remote/query/${encodeURIComponent(query_id)}`;
}

/**
 * @returns {{ zone_id: string; api_token: string } | null}
 */
function get_purge_credentials() {
	const zone_id = /** @type {unknown} */ (/** @type {any} */ (env).CLOUDFLARE_ZONE_ID);
	const api_token = /** @type {unknown} */ (/** @type {any} */ (env).CLOUDFLARE_API_TOKEN);

	if (typeof zone_id !== 'string' || zone_id.length === 0) {
		return null;
	}

	if (typeof api_token !== 'string' || api_token.length === 0) {
		return null;
	}

	return { zone_id, api_token };
}

/**
 * @typedef {{ maxAge: number; staleWhileRevalidate?: number; tags: string[] }} KitCacheOptions
 */

/**
 * @param {KitCacheOptions} cache
 */
function create_cache_control(cache) {
	const value = ['public', `max-age=${Math.floor(cache.maxAge)}`];

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

			if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
				await runtime_cache.delete(get_cache_key(query_id));
				return;
			}

			const tags = cache.tags;
			const headers = new Headers({
				'Cache-Control': create_cache_control(cache)
			});

			if (tags.length > 0) {
				headers.set('Cache-Tag', tags.join(','));
			}

			await runtime_cache.put(
				get_cache_key(query_id),
				new Response(stringified_response, { headers })
			);
		},

		setHeaders(headers, cache) {
			const tags = cache.tags;
			const cache_control = create_cache_control(cache);

			headers.set('CDN-Cache-Control', cache_control);
			headers.set('Cloudflare-CDN-Cache-Control', cache_control);

			if (tags.length > 0) {
				headers.set('Cache-Tag', tags.join(','));
			}
		},

		async invalidate(tags) {
			if (tags.length === 0) return;

			const credentials = get_purge_credentials();
			if (!credentials) {
				throw new Error(
					'CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN must be configured to invalidate Cloudflare cache tags'
				);
			}

			const response = await fetch(
				`https://api.cloudflare.com/client/v4/zones/${credentials.zone_id}/purge_cache`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${credentials.api_token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						tags
					})
				}
			);

			/** @type {{ success?: boolean } | null} */
			const body = await response.json().catch(() => null);

			if (!response.ok || body?.success !== true) {
				// TODO should we really throw an error here? or hav invalidate return a boolean?
				throw new Error(
					`Cloudflare cache purge failed (${response.status} ${response.statusText})`
				);
			}
		}
	};
}
