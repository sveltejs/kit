/** @import { KitCacheOptions, RequestState } from 'types' */
/** @import { CacheOptions, RequestCache } from '@sveltejs/kit' */

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
 * @param {CacheOptions} input
 * @returns {KitCacheOptions}
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
 * @returns {RequestCache}
 */
export function create_request_cache(state, query_key) {
	/** @type {{ options: CacheOptions | null }} */
	const cache_state = {
		options: null
	};

	/** @param {CacheOptions} input */
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
 * @returns {RequestCache}
 */
export function create_invalidate_cache(state) {
	function cache() {
		throw new Error(
			'query.cache() can only be used inside querying remote functions `query` and `prerender`)'
		);
	}

	/** @param {string[]} tags */
	cache.invalidate = async (tags) => {
		if (!state.remote.cache) {
			console.error('No cache implementation provided, cannot invalidate remote function cache');
		} else {
			state.remote.cache.invalidate(tags);
		}
	};

	return cache;
}

/**
 * @param {RequestCache} cache
 * @returns {KitCacheOptions | null}
 */
export function get_request_cache_options(cache) {
	const cache_state = /** @type {{ options: KitCacheOptions | null } | undefined} */ (
		/** @type {any} */ (cache)[cache_state_symbol]
	);

	return cache_state?.options ?? null;
}
