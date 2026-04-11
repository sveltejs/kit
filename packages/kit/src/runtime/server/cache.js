/** @import { RequestState } from 'types' */
import { stringify_remote_arg, create_remote_key } from '../shared.js';

/**
 * @typedef {{ maxAge: number; tags: string[]; staleWhileRevalidate?: number }} RequestCacheOptions
 */

/**
 * Numeric duration in seconds from strings like `30s`, `100s`, `5m`, `1h`, or plain `0`.
 * @param {string | number} value
 * @returns {number}
 */
export function parse_cache_duration(value) {
	if (typeof value === 'number') {
		if (!Number.isFinite(value) || value < 0) {
			throw new Error('cache duration must be a non-negative finite number');
		}
		return Math.floor(value);
	}

	const match = String(value)
		.trim()
		.match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/i);

	if (!match) {
		throw new Error(
			`Invalid cache duration "${value}" — expected a string like "30s", "5m", or "1h"`
		);
	}

	const count = Number(match[1]);
	const unit = (match[2] ?? 's').toLowerCase();

	if (!Number.isFinite(count) || count < 0) {
		throw new Error('cache duration must be a non-negative number');
	}

	switch (unit) {
		case 'm':
			return Math.floor(count * 60);
		case 'h':
			return Math.floor(count * 3600);
		default:
			return Math.floor(count);
	}
}

/**
 * @param {import('@sveltejs/kit').CacheOptions} input
 * @returns {RequestCacheOptions}
 */
function normalize_cache_input(input) {
	const maxAge = parse_cache_duration(input.maxAge);
	const staleWhileRevalidate =
		input.staleWhileRevalidate !== undefined
			? parse_cache_duration(input.staleWhileRevalidate)
			: undefined;

	return {
		maxAge,
		staleWhileRevalidate:
			staleWhileRevalidate && staleWhileRevalidate > 0 ? staleWhileRevalidate : undefined,
		tags: input.tags ? [...input.tags] : []
	};
}

export function create_erroring_cache() {
	function cache() {
		throw new Error(
			'query.cache() can only be used inside remote functions `query` and `prerender`'
		);
	}

	cache.invalidate = () => {
		throw new Error('query.cache.invalidate() can only be used inside remote functions');
	};

	return cache;
}

const cache_state_symbol = Symbol('sveltekit.request_cache_state');

/**
 * @param {RequestState} state
 * @param {string} query_key
 * @returns {import('@sveltejs/kit').RequestCache}
 */
export function create_request_cache(state, query_key) {
	/** @type {{ options: RequestCacheOptions | null }} */
	const cache_state = {
		options: null
	};

	/** @param {import('@sveltejs/kit').CacheOptions} input */
	function cache(input) {
		if (!state.remote.cache) {
			console.error('No cache implementation provided, cannot cache remote function response');
			return;
		}

		if (cache_state.options) {
			console.error('Cache options already set, cannot set cache options again');
			return;
		}

		const normalized = normalize_cache_input(input);
		normalized.tags.push(query_key);

		cache_state.options = {
			maxAge: normalized.maxAge,
			staleWhileRevalidate: normalized.staleWhileRevalidate,
			tags: normalized.tags
		};
	}

	cache.invalidate = () => {
		throw new Error(
			'query.cache.invalidate() can only be used inside mutating remote functions (`command`, `form`)'
		);
	};

	Object.defineProperty(cache, cache_state_symbol, {
		value: cache_state
	});

	return cache;
}

/**
 * @param {RequestState} state
 * @returns {import('@sveltejs/kit').RequestCache}
 */
export function create_invalidate_cache(state) {
	function cache() {
		throw new Error(
			'query.cache() can only be used inside querying remote functions `query` and `prerender`)'
		);
	}

	/** @param {string[]} tags */
	cache.invalidate = (tags) => {
		if (!state.remote.cache) {
			console.error('No cache implementation provided, cannot invalidate remote function cache');
		} else {
			state.remote.cache.invalidate(tags);
		}
	};

	return cache;
}

/**
 * @param {import('@sveltejs/kit').RequestCache} cache
 * @returns {RequestCacheOptions | null}
 */
export function get_request_cache_options(cache) {
	const cache_state = /** @type {{ options: RequestCacheOptions | null } | undefined} */ (
		/** @type {any} */ (cache)[cache_state_symbol]
	);

	return cache_state?.options ?? null;
}

/**
 * @param {Headers} headers
 * @param {RequestCacheOptions} options
 */
export function apply_cache_headers(headers, options) {
	const content = ['public', `max-age=${options.maxAge}`];

	if (options.staleWhileRevalidate) {
		content.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
	}

	headers.set('CDN-Cache-Control', content.join(', '));

	if (options.tags.length > 0) {
		headers.set('Cache-Tag', options.tags.join(','));
	}
}
