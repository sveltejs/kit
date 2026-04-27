// Redis cache implementation for remote query responses.

// @ts-ignore optional dependency provided by the user cache adapter setup
import { createClient } from 'redis';

/**
 * @typedef {{ expires: number; tags: string[]; value: string; versions: Record<string, number> }} RedisCacheEntry
 */

/**
 * @typedef {{
 *   url?: string;
 *   prefix?: string;
 * }} RedisQueryCacheOptions
 */

/**
 * @param {RedisQueryCacheOptions} [options]
 * @returns {import('types').KitCacheHandler}
 */
export default function create_redis_query_cache(options = {}) {
	const prefix = options.prefix ?? 'sveltekit:query-cache';
	const redis_url = options.url ?? process.env.REDIS_URL;

	/** @type {Promise<ReturnType<typeof createClient>> | undefined} */
	let client_promise;

	const get_client = () => {
		if (!redis_url) {
			throw new Error(
				'Redis query cache requires a `url` option or the REDIS_URL environment variable'
			);
		}

		return (client_promise ??= create_client(redis_url));
	};

	return {
		async get(query_id) {
			const client = await get_client();
			const hit = parse_cache_entry(await client.get(entry_key(prefix, query_id)));
			if (!hit || hit.expires <= Date.now()) return undefined;

			const versions = await get_tag_versions(client, prefix, hit.tags);

			return hit.tags.every((tag) => hit.versions[tag] === versions[tag]) ? hit.value : undefined;
		},

		async set(query_id, stringified_response, cache) {
			const client = await get_client();

			if (!Number.isFinite(cache.maxAge) || cache.maxAge <= 0) {
				await client.del(entry_key(prefix, query_id));
				return;
			}

			const stale_while_revalidate =
				cache.staleWhileRevalidate !== undefined && cache.staleWhileRevalidate > 0
					? cache.staleWhileRevalidate
					: 0;

			const tags = cache.tags.filter(Boolean);
			const ttl = Math.ceil((cache.maxAge + stale_while_revalidate) * 1000);
			const expires = Date.now() + ttl;
			const versions = await get_tag_versions(client, prefix, tags);

			await client.set(
				entry_key(prefix, query_id),
				JSON.stringify({ expires, tags, value: stringified_response, versions }),
				{ PX: ttl }
			);
		},

		async invalidate(tags) {
			const filtered_tags = tags.filter(Boolean);
			if (filtered_tags.length === 0) return;

			const transaction = (await get_client()).multi();

			for (const tag of filtered_tags) {
				transaction.incr(tag_version_key(prefix, tag));
			}

			await transaction.exec();
		}
	};
}

/**
 * @param {string} url
 */
async function create_client(url) {
	const client = createClient({ url });

	client.on('error', (/** @type {unknown} */ error) => {
		console.error('Redis query cache error', error);
	});

	await client.connect();
	return client;
}

/**
 * @param {ReturnType<typeof createClient>} client
 * @param {string} prefix
 * @param {string[]} tags
 */
async function get_tag_versions(client, prefix, tags) {
	const values =
		tags.length > 0 ? await client.mGet(tags.map((tag) => tag_version_key(prefix, tag))) : [];

	/** @type {Record<string, number>} */
	const versions = {};

	for (let i = 0; i < tags.length; i += 1) {
		versions[tags[i]] = parse_tag_version(values[i]);
	}

	return versions;
}

/**
 * @param {unknown} value
 */
function parse_tag_version(value) {
	const version = Number(value);
	return Number.isSafeInteger(version) && version >= 0 ? version : 0;
}

/**
 * @param {unknown} value
 * @returns {RedisCacheEntry | null}
 */
function parse_cache_entry(value) {
	if (value == null) return null;

	try {
		const parsed = /** @type {RedisCacheEntry} */ (JSON.parse(String(value)));

		if (
			typeof parsed.expires !== 'number' ||
			typeof parsed.value !== 'string' ||
			!Array.isArray(parsed.tags) ||
			!parsed.tags.every((tag) => typeof tag === 'string') ||
			!parsed.versions ||
			typeof parsed.versions !== 'object'
		) {
			return null;
		}

		return /** @type {RedisCacheEntry} */ (parsed);
	} catch {
		return null;
	}
}

/**
 * @param {string} prefix
 * @param {string} query_id
 */
function entry_key(prefix, query_id) {
	return `${prefix}:entry:${query_id}`;
}

/**
 * @param {string} prefix
 * @param {string} tag
 */
function tag_version_key(prefix, tag) {
	return `${prefix}:tag:${tag}:version`;
}
