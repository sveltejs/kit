/**
 * @returns {import('@sveltejs/kit').Adapter['cache']}
 */
export function inMemoryCache() {
	return {
		path: '@sveltejs/kit/node/in-memory-cache'
	};
}

/**
 * @param {import('./redis-query-cache.js').RedisQueryCacheOptions} [options]
 * @returns {import('@sveltejs/kit').Adapter['cache']}
 */
export function redisCache(options = {}) {
	return {
		path: '@sveltejs/kit/node/redis-cache',
		options
	};
}
