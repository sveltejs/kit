import { env } from 'cloudflare:workers';

/**
 * @typedef {{ maxAge: number; staleWhileRevalidate?: number; tags: string[] }} KitCacheOptions
 * @typedef {NonNullable<import('./index.js').AdapterCacheOptions & { strategy: 'kv' }>} CloudflareKvCacheOptions
 * @typedef {{ v?: Record<string, number>; data?: unknown; expires?: unknown }} VersionedCacheEntry
 */

/**
 * @param {string} query_id
 */
function get_cache_key(query_id) {
	return `cache:https://sveltekit.remote/query/${encodeURIComponent(query_id)}`;
}

/**
 * @param {string} tag
 */
function get_tag_version_key(tag) {
	return `tag:${tag}:v`;
}

/**
 * @param {unknown} value
 */
function parse_tag_version(value) {
	const version = Number(value);
	return Number.isSafeInteger(version) && version >= 0 ? version : 0;
}

/**
 * @param {KVNamespace} kv
 * @param {string[]} tags
 */
async function get_tag_versions(kv, tags) {
	/** @type {Record<string, number>} */
	const versions = {};

	await Promise.all(
		tags.map(async (tag) => {
			versions[tag] = parse_tag_version(await kv.get(get_tag_version_key(tag)));
		})
	);

	return versions;
}

/**
 * @param {CloudflareKvCacheOptions} options
 */
function get_kv_namespace(options) {
	if (typeof options.kvBinding !== 'string' || options.kvBinding.length === 0) {
		throw new Error(
			'kvBinding must be configured to use the Cloudflare KV cache strategy, for example adapter({ cache: { strategy: "kv", kvBinding: "MY_KV" } })'
		);
	}

	const kv = /** @type {unknown} */ (/** @type {any} */ (env)[options.kvBinding]);

	if (
		!kv ||
		typeof kv !== 'object' ||
		typeof (/** @type {KVNamespace} */ (kv).get) !== 'function' ||
		typeof (/** @type {KVNamespace} */ (kv).put) !== 'function' ||
		typeof (/** @type {KVNamespace} */ (kv).delete) !== 'function'
	) {
		throw new Error(
			`Cloudflare KV binding "${options.kvBinding}" must be configured to use the KV cache strategy`
		);
	}

	return /** @type {KVNamespace} */ (kv);
}

/**
 * @param {CloudflareKvCacheOptions} [options]
 * @returns {import('@sveltejs/kit').KitCacheHandler}
 */
export default function create_cache(options = {}) {
	return {
		async get(query_id) {
			const kv = get_kv_namespace(options);
			const cached = /** @type {VersionedCacheEntry | null} */ (
				await kv.get(get_cache_key(query_id), 'json')
			);

			if (!cached || typeof cached.data !== 'string' || typeof cached.v !== 'object') {
				return undefined;
			}

			if (typeof cached.expires !== 'number' || cached.expires <= Date.now()) {
				return undefined;
			}

			const versions = cached.v;
			const tags = Object.keys(versions);
			const current_versions = await get_tag_versions(kv, tags);

			return tags.every((tag) => versions[tag] === current_versions[tag]) ? cached.data : undefined;
		},

		async set(query_id, stringified_response, cache) {
			const kv = get_kv_namespace(options);
			const key = get_cache_key(query_id);

			if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
				await kv.delete(key);
				return;
			}

			const versions = await get_tag_versions(kv, cache.tags);

			await kv.put(
				key,
				JSON.stringify({
					v: versions,
					data: stringified_response,
					expires: Date.now() + Math.floor(cache.maxAge) * 1000
				})
			);
		},

		async invalidate(tags) {
			if (tags.length === 0) return;

			const kv = get_kv_namespace(options);

			await Promise.all(
				tags.map(async (tag) => {
					const key = get_tag_version_key(tag);
					const version = parse_tag_version(await kv.get(key));
					await kv.put(key, String(version + 1));
				})
			);
		}
	};
}
