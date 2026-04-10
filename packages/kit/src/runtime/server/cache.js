/** @import { RequestState } from 'types' */
import {
	SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER,
	SVELTEKIT_CACHE_CONTROL_TAGS_HEADER,
	stringify_remote_arg,
	create_remote_key,
	SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER
} from '../shared.js';

/**
 * @typedef {object} KitCacheDirective
 * @property {'public' | 'private'} scope
 * @property {number} maxAgeSeconds
 * @property {number} [staleSeconds]
 * @property {string[]} tags
 * @property {boolean} refresh
 */

/**
 * Numeric duration in seconds from strings like `30s`, `100s`, `5m`, `1h`, `1d`, or plain `0`.
 * `ms` values are rounded up to at least 1 second when non-zero.
 * @param {string | number} value
 * @returns {number}
 */
export function parse_cache_duration(value) {
	if (typeof value === 'number') {
		if (!Number.isFinite(value) || value < 0) {
			throw new Error('cache ttl must be a non-negative finite number');
		}
		return Math.floor(value);
	}
	const m = String(value)
		.trim()
		.match(/^(\d+(?:\.\d+)?)\s*(s|m|h)?$/i);
	if (!m) {
		throw new Error(
			`Invalid cache duration "${value}" — expected a string like "30s", "5m", or "1h"`
		);
	}
	const n = Number(m[1]);
	const unit = (m[2] ?? 's').toLowerCase();
	if (!Number.isFinite(n) || n < 0) {
		throw new Error('cache ttl must be a non-negative number');
	}
	/** @type {number} */
	let seconds;
	switch (unit) {
		case 's':
			seconds = Math.floor(n);
			break;
		case 'm':
			seconds = Math.floor(n * 60);
			break;
		case 'h':
			seconds = Math.floor(n * 3600);
			break;
		default:
			seconds = Math.floor(n);
	}
	return seconds;
}

/**
 * @typedef {object} NormalizedCacheInput
 * @property {number} ttl
 * @property {number} [stale]
 * @property {'public' | 'private'} scope
 * @property {string[]} [tags]
 * @property {boolean} refresh
 */

/**
 * @param {string | import('@sveltejs/kit').CacheOptions} input
 * @returns {NormalizedCacheInput}
 */
function normalize_cache_input(input) {
	if (typeof input === 'string') {
		return { ttl: parse_cache_duration(input), scope: 'public', refresh: true };
	}
	const ttl = parse_cache_duration(input.ttl);
	const stale = input.stale !== undefined ? parse_cache_duration(input.stale) : undefined;
	return {
		ttl,
		stale,
		scope: input.scope ?? 'private',
		tags: input.tags ? [...input.tags] : undefined,
		refresh: input.refresh !== true
	};
}

/**
 * @param {string[]} tags
 * @param {string | null | undefined} remote_id
 */
export function merge_remote_cache_tags(tags, remote_id) {
	if (!remote_id) return tags;
	const t = `sveltekit-remote:${remote_id.replace(/\//g, ':')}`;
	if (tags.includes(t)) return tags;
	return [...tags, t];
}

export function create_erroring_cache() {
	function cache() {
		throw new Error(
			'query.cache() can only be used inside remote functions (`query`, `query.batch`, `prerender`)'
		);
	}
	cache.invalidate = () => {
		throw new Error('query.cache.invalidate() can only be used inside remote functions');
	};
	return cache;
}

/**
 * @param {RequestState} state
 * @param {string} remote_id
 * @param {any} arg
 * @returns {import('@sveltejs/kit').RequestCache}
 */
export function create_request_cache(state, remote_id, arg) {
	/**
	 * @param {string | import('@sveltejs/kit').CacheOptions} input
	 */
	function cache(input) {
		const opts = normalize_cache_input(input);
		const bag = get_bag(state);
		const prev = bag.directive;
		let tags = opts.tags;
		if (!tags?.length) {
			// align with how url is constructed on the client, which is used for the cache key
			const invalidate_key =
				arg !== undefined
					? create_remote_key(remote_id, stringify_remote_arg(arg, state.transport))
					: remote_id;
			tags = [invalidate_key];
		}

		const staleSeconds =
			opts.refresh && opts.stale !== undefined && opts.stale > 0 ? opts.stale : undefined;

		bag.directive = {
			scope: opts.scope,
			maxAgeSeconds: opts.ttl,
			staleSeconds,
			tags: unique_merge(prev?.tags, tags),
			refresh: opts.refresh
		};
	}

	cache.invalidate = () => {
		// TODO should we allow invalidate instead?
		throw new Error(
			'query.cache.invalidate() can only be used inside mutating remote functions (`command`, `form`)'
		);
	};

	return cache;
}

/**
 * @param {RequestState} state
 * @returns {import('@sveltejs/kit').RequestCache}
 */
export function create_invalidate_cache(state) {
	function cache() {
		throw new Error(
			'query.cache() can only be used inside querying remote functions (`query`, `query.batch`, `prerender`)'
		);
	}

	/** @param {string[]} tags */
	function invalidate(tags) {
		const bag = get_bag(state);
		for (const t of tags) {
			if (!bag.invalidations.includes(t)) {
				bag.invalidations.push(t);
			}
		}
	}

	cache.invalidate = invalidate;

	return cache;
}

/** @param {RequestState} state */
function get_bag(state) {
	state.remote.kit_cache ??= { directive: null, invalidations: [] };
	return state.remote.kit_cache;
}

/**
 * @param {string[] | undefined} a
 * @param {string[]} b
 */
function unique_merge(a, b) {
	const out = [];
	const seen = new Set();
	for (const x of [...(a ?? []), ...b]) {
		if (!seen.has(x)) {
			seen.add(x);
			out.push(x);
		}
	}
	return out;
}

/**
 * @param {Headers} headers
 * @param {KitCacheDirective} directive
 */
export function apply_cache_headers(headers, directive) {
	const tags = directive.tags;

	if (directive.scope === 'private') {
		const parts = ['private', `max-age=${directive.maxAgeSeconds}`];
		if (directive.staleSeconds && directive.refresh) {
			parts.push(`stale-while-revalidate=${directive.staleSeconds}`);
		}
		headers.set(SVELTEKIT_RUNTIME_CACHE_CONTROL_HEADER, parts.join(', '));
		if (tags.length) {
			headers.set(SVELTEKIT_CACHE_CONTROL_TAGS_HEADER, tags.join(','));
		}
		return;
	}

	const cdn = ['public', `max-age=${directive.maxAgeSeconds}`];
	if (directive.staleSeconds && directive.refresh) {
		cdn.push(`stale-while-revalidate=${directive.staleSeconds}`);
	}
	headers.set('CDN-Cache-Control', cdn.join(', '));
	if (tags.length) {
		headers.set('Cache-Tag', tags.join(','));
	}
}

/**
 * @param {Response} response
 * @param {RequestState} state
 * @param {string | null | undefined} remote_id
 * @param {import('types').KitCacheHandler | null | undefined} handler
 */
export async function finalize_kit_cache(response, state, remote_id, handler) {
	const bag = state.remote.kit_cache;
	const directive = bag?.directive;

	if (response.ok && directive) {
		// if (handler?.setHeaders) {
		// 	await handler.setHeaders(response.headers, directive, { remote_id });
		// } else {
		apply_cache_headers(response.headers, directive);
		// }
	}

	if (handler?.invalidate && bag?.invalidations?.length) {
		await handler.invalidate(bag.invalidations);
	}

	for (const tag of bag?.invalidations ?? []) {
		response.headers.append(SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER, tag);
	}
}
