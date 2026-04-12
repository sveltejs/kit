import { getCache, invalidateByTag } from '@vercel/functions';

/**
 * @typedef {{ maxAge: number; tags: string[]; staleWhileRevalidate?: number }} CacheMetadata
 */

/**
 * @param {string} query_id
 * @returns {Promise<string | undefined>}
 */
export async function get(query_id) {
	const value = await getCache().get(query_id);

	if (typeof value === 'string') {
		return value;
	}

	return undefined;
}

/**
 * @param {string} query_id
 * @param {string} stringified_response
 * @param {CacheMetadata} cache
 * @returns {Promise<void>}
 */
export async function set(query_id, stringified_response, cache) {
	const runtime_cache = getCache();

	if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
		await runtime_cache.delete(query_id);
		return;
	}

	await runtime_cache.set(query_id, stringified_response, {
		ttl: Math.floor(cache.maxAge),
		tags: cache.tags
	});
}

/**
 * @param {Headers} headers
 * @param {CacheMetadata} cache
 * @returns {Promise<void>}
 */
export async function setHeaders(headers, cache) {
	const tags = cache.tags;
	const cache_control = create_cache_control(cache);

	headers.set('CDN-Cache-Control', cache_control);
	headers.set('Vercel-CDN-Cache-Control', cache_control);

	if (tags.length > 0) {
		const value = tags.join(',');
		headers.set('Cache-Tag', value);
		headers.set('Vercel-Cache-Tag', value);
	}
}

/**
 * @param {string[]} tags
 * @returns {Promise<void>}
 */
export async function invalidate(tags) {
	if (tags.length === 0) return;

	const runtime_cache = getCache();

	await Promise.all([runtime_cache.expireTag(tags), invalidateByTag(tags)]);
}

/**
 * @param {CacheMetadata} cache
 */
function create_cache_control(cache) {
	const value = ['public', `max-age=${Math.floor(cache.maxAge)}`];

	if (cache.staleWhileRevalidate && cache.staleWhileRevalidate > 0) {
		value.push(`stale-while-revalidate=${Math.floor(cache.staleWhileRevalidate)}`);
	}

	return value.join(', ');
}
