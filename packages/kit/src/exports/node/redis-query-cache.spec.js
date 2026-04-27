import { beforeEach, describe, expect, test, vi } from 'vitest';
import create_redis_query_cache from './redis-query-cache.js';

const redis = vi.hoisted(() => {
	/** @type {Array<ReturnType<typeof create_redis_client>>} */
	const clients = [];

	return {
		clients,
		createClient: vi.fn((/** @type {{ url: string }} */ options) => {
			const client = create_redis_client(options);
			clients.push(client);
			return client;
		})
	};
});

vi.mock('redis', () => ({
	createClient: redis.createClient
}));

beforeEach(() => {
	redis.clients.length = 0;
	redis.createClient.mockClear();
});

describe('create_redis_query_cache', () => {
	test('returns cache miss for unknown key', async () => {
		const cache = create_redis_query_cache({ url: 'redis://localhost' });
		expect(await cache.get('query/a')).toBeUndefined();
	});

	test('stores and returns values after get/set cycle', async () => {
		const cache = create_redis_query_cache({ url: 'redis://localhost' });

		await cache.set('query/a', '{"a":1}', { maxAge: 60, tags: ['a'] });

		expect(await cache.get('query/a')).toBe('{"a":1}');
	});

	test('expires entries after stale window', async () => {
		vi.useFakeTimers();

		try {
			const cache = create_redis_query_cache({ url: 'redis://localhost' });
			await cache.set('query/a', '{"a":1}', {
				maxAge: 1,
				staleWhileRevalidate: 2,
				tags: ['a']
			});

			vi.advanceTimersByTime(1500);
			expect(await cache.get('query/a')).toBe('{"a":1}');

			vi.advanceTimersByTime(2000);
			expect(await cache.get('query/a')).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	test('invalidates by tag', async () => {
		const cache = create_redis_query_cache({ url: 'redis://localhost' });

		await cache.set('query/a', '{"a":1}', { maxAge: 60, tags: ['posts'] });
		await cache.set('query/b', '{"b":1}', { maxAge: 60, tags: ['comments'] });

		await cache.invalidate(['posts']);

		expect(await cache.get('query/a')).toBeUndefined();
		expect(await cache.get('query/b')).toBe('{"b":1}');
	});

	test('invalidates entries that have any matching tag', async () => {
		const cache = create_redis_query_cache({ url: 'redis://localhost' });

		await cache.set('query/a', '{"a":1}', { maxAge: 60, tags: ['posts', 'feed'] });

		await cache.invalidate(['posts']);

		expect(await cache.get('query/a')).toBeUndefined();
	});

	test('keeps entries cached after a later invalidation of the same tag', async () => {
		const cache = create_redis_query_cache({ url: 'redis://localhost' });

		await cache.set('query/a', '{"a":1}', { maxAge: 60, tags: ['posts'] });
		await cache.invalidate(['posts']);
		await cache.set('query/b', '{"b":1}', { maxAge: 60, tags: ['posts'] });

		expect(await cache.get('query/a')).toBeUndefined();
		expect(await cache.get('query/b')).toBe('{"b":1}');
	});

	test('invalidates tags in a Redis transaction', async () => {
		const cache = create_redis_query_cache({ url: 'redis://localhost' });

		await cache.invalidate(['posts', 'feed']);

		expect(redis.clients[0].transactions).toEqual([
			[
				['INCR', 'sveltekit:query-cache:tag:posts:version'],
				['INCR', 'sveltekit:query-cache:tag:feed:version']
			]
		]);
	});

	test('uses REDIS_URL when no url option is provided', async () => {
		vi.stubEnv('REDIS_URL', 'redis://from-env');

		try {
			const cache = create_redis_query_cache();
			await cache.get('query/a');

			expect(redis.createClient).toHaveBeenCalledWith({ url: 'redis://from-env' });
		} finally {
			vi.unstubAllEnvs();
		}
	});
});

/**
 * @param {{ url: string }} options
 */
function create_redis_client(options) {
	/** @type {Map<string, string>} */
	const strings = new Map();
	/** @type {Map<string, number>} */
	const expiries = new Map();
	/** @type {string[][][]} */
	const transactions = [];

	/** @param {string} key */
	function expire(key) {
		const expires = expiries.get(key);
		if (expires === undefined || expires > Date.now()) return;

		strings.delete(key);
		expiries.delete(key);
	}

	const client = {
		options,
		transactions,
		connect: vi.fn(() => Promise.resolve()),
		on: vi.fn(),
		/** @param {string} key */
		async get(key) {
			expire(key);
			return strings.get(key) ?? null;
		},
		/**
		 * @param {string} key
		 * @param {string} value
		 * @param {{ PX?: number }} [options]
		 */
		async set(key, value, options) {
			strings.set(key, value);
			if (options?.PX !== undefined) {
				expiries.set(key, Date.now() + options.PX);
			}
		},
		/** @param {string[]} keys */
		async mGet(keys) {
			return keys.map((key) => {
				expire(key);
				return strings.get(key) ?? null;
			});
		},
		/** @param {string} key */
		async del(key) {
			const removed = strings.delete(key) ? 1 : 0;
			expiries.delete(key);
			return removed;
		},
		/** @param {string} key */
		async incr(key) {
			const value = Number(strings.get(key) ?? 0) + 1;
			strings.set(key, String(value));
			return value;
		},
		multi() {
			/** @type {string[][]} */
			const commands = [];

			return {
				/** @param {string} key */
				incr(key) {
					commands.push(['INCR', key]);
					return this;
				},
				async exec() {
					transactions.push(commands);
					return Promise.all(commands.map(([, key]) => client.incr(key)));
				}
			};
		}
	};

	return client;
}
