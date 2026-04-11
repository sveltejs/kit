import { describe, expect, test, vi } from 'vitest';
import create_in_memory_query_cache from './in-memory-query-cache.js';

describe('create_in_memory_query_cache', () => {
	test('returns cache miss for unknown key', async () => {
		const cache = create_in_memory_query_cache();
		expect(await cache.get('query/a')).toBeUndefined();
	});

	test('stores and returns values after get/set cycle', async () => {
		const cache = create_in_memory_query_cache();

		await cache.get('query/a');
		await cache.set('query/a', '{"a":1}', { maxAge: 60, tags: ['a'] });

		expect(await cache.get('query/a')).toBe('{"a":1}');
	});

	test('expires entries after stale window', async () => {
		vi.useFakeTimers();

		try {
			const cache = create_in_memory_query_cache();
			await cache.get('query/a');
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
		const cache = create_in_memory_query_cache();

		await cache.get('query/a');
		await cache.set('query/a', '{"a":1}', { maxAge: 60, tags: ['posts'] });
		await cache.get('query/b');
		await cache.set('query/b', '{"b":1}', { maxAge: 60, tags: ['comments'] });

		await cache.invalidate(['posts']);

		expect(await cache.get('query/a')).toBeUndefined();
		expect(await cache.get('query/b')).toBe('{"b":1}');
	});
});
