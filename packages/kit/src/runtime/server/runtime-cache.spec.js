import { describe, expect, test, vi } from 'vitest';
import { max_age_from_headers, RuntimeCacheStore } from './runtime-cache.js';
import { SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER } from '../shared.js';

describe('max_age_from_headers', () => {
	test('prefers CDN-Cache-Control over cache-control', () => {
		const h = new Headers();
		h.set('CDN-Cache-Control', 'public, max-age=60');
		h.set('cache-control', 'max-age=10');
		expect(max_age_from_headers(h)).toBe(60);
	});

	test('falls back to cache-control', () => {
		const h = new Headers();
		h.set('cache-control', 'public, max-age=30');
		expect(max_age_from_headers(h)).toBe(30);
	});

	test('returns 0 when absent', () => {
		expect(max_age_from_headers(new Headers())).toBe(0);
	});
});

describe('RuntimeCacheStore', () => {
	const minimal_opts = { getClientAddress: () => '127.0.0.1' };

	test('serves fresh cache hit for GET without calling server twice', async () => {
		const store = new RuntimeCacheStore();
		const url = 'http://localhost/cache-test';
		const server = {
			init: vi.fn(),
			respond: vi.fn().mockResolvedValue(
				new Response('one', {
					status: 200,
					headers: { 'CDN-Cache-Control': 'public, max-age=60' }
				})
			)
		};

		const a = await store.respond(new Request(url), minimal_opts, server);
		const b = await store.respond(new Request(url), minimal_opts, server);

		expect(await a.text()).toBe('one');
		expect(await b.text()).toBe('one');
		expect(server.respond).toHaveBeenCalledTimes(1);
	});

	test('invalidate_tags evicts matching cached entries', async () => {
		const store = new RuntimeCacheStore();
		const url = 'http://localhost/tagged';
		let n = 0;
		const server = {
			init: vi.fn(),
			respond: vi.fn().mockImplementation(() => {
				n += 1;
				return Promise.resolve(
					new Response(String(n), {
						status: 200,
						headers: {
							'CDN-Cache-Control': 'public, max-age=60',
							'Cache-Tag': 'alpha'
						}
					})
				);
			})
		};

		await store.respond(new Request(url), minimal_opts, server);
		await store.respond(new Request(url), minimal_opts, server);
		expect(server.respond).toHaveBeenCalledTimes(1);

		store.invalidate_tags(['alpha']);
		const after = await store.respond(new Request(url), minimal_opts, server);
		expect(await after.text()).toBe('2');
		expect(server.respond).toHaveBeenCalledTimes(2);
	});

	test('POST applies invalidations from response', async () => {
		const store = new RuntimeCacheStore();
		const get_url = 'http://localhost/x';
		const server = {
			init: vi.fn(),
			respond: vi
				.fn()
				.mockResolvedValueOnce(
					new Response('cached', {
						status: 200,
						headers: {
							'CDN-Cache-Control': 'public, max-age=60',
							'Cache-Tag': 't-post'
						}
					})
				)
				.mockResolvedValueOnce(
					new Response(null, {
						status: 204,
						headers: { [SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER]: 't-post' }
					})
				)
				.mockResolvedValue(
					new Response('fresh', {
						status: 200,
						headers: {
							'CDN-Cache-Control': 'public, max-age=60',
							'Cache-Tag': 't-post'
						}
					})
				)
		};

		await store.respond(new Request(get_url), minimal_opts, server);
		await store.respond(new Request(get_url), minimal_opts, server);
		expect(server.respond).toHaveBeenCalledTimes(1);

		await store.respond(
			new Request('http://localhost/mutate', { method: 'POST' }),
			minimal_opts,
			server
		);

		const final = await store.respond(new Request(get_url), minimal_opts, server);
		expect(await final.text()).toBe('fresh');
		expect(server.respond).toHaveBeenCalledTimes(3);
	});
});
