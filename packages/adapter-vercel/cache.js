import { getCache } from '@vercel/functions';

/** @returns {import('@sveltejs/kit').KitCacheHandler} */
export default function create_cache() {
	return {
		async get(query_id) {
			const value = await getCache().get(query_id);

			if (typeof value === 'string') {
				return value;
			}

			return undefined;
		},
		async set(query_id, stringified_response, cache) {
			const runtime_cache = getCache();

			if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
				await runtime_cache.delete(query_id);
				return;
			}

			await runtime_cache.set(query_id, stringified_response, {
				ttl: Math.floor(cache.maxAge),
				tags: cache.tags
			});
		},
		setHeaders(headers, cache) {
			const tags = cache.tags;
			const value = ['public', `max-age=${Math.floor(cache.maxAge)}`];
			if (cache.staleWhileRevalidate && cache.staleWhileRevalidate > 0) {
				value.push(`stale-while-revalidate=${Math.floor(cache.staleWhileRevalidate)}`);
			}
			const cache_control = value.join(', ');

			headers.set('Vercel-CDN-Cache-Control', cache_control);

			if (tags.length > 0) {
				const value = tags.join(',');
				headers.set('Vercel-Cache-Tag', value);
			}
		},
		async invalidate(tags) {
			if (tags.length === 0) return;

			await getCache().expireTag(tags); // besides deleting from the cache this also purges the tag on the CDN
		}
	};
}
