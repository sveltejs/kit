import { describe, expect, test, beforeEach, vi } from 'vitest';
import { tick } from 'svelte';

// Mock `client.js` and `shared.svelte.js` because the real `client.js` pulls in the
// SvelteKit router/hydration machinery and resolves `$app/paths` to a server-side
// virtual module that only exists during a real SvelteKit build. We only need the
// cache `Map`s and a stub `app` for the proxy's interaction with the cache.
vi.mock(new URL('../../client.js', import.meta.url).pathname, () => ({
	app: { hooks: { transport: {} }, decoders: {} },
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	goto: () => {}
}));

vi.mock(new URL('../shared.svelte.js', import.meta.url).pathname, () => ({
	QUERY_FUNCTION_ID: Symbol('QUERY_FUNCTION_ID'),
	QUERY_OVERRIDE_KEY: Symbol('QUERY_OVERRIDE_KEY'),
	QUERY_RESOURCE_KEY: Symbol('QUERY_RESOURCE_KEY'),
	get_remote_request_headers: () => ({}),
	remote_request: () => Promise.resolve(null),
	is_in_effect: () => false,
	handle_side_channel_response: () => Promise.resolve(undefined)
}));

const { QueryProxy } = await import('./proxy.js');
const { query_map } = await import('../../client.js');

/**
 * Force GC several times and pump microtasks/macrotasks so the FinalizationRegistry
 * callback gets a chance to fire and the deferred eviction (`tick().then(...)`) flushes.
 */
async function run_gc() {
	for (let i = 0; i < 4; i++) {
		/** @type {() => void} */ (/** @type {any} */ (globalThis).gc)();
		await new Promise((resolve) => setTimeout(resolve, 0));
		await Promise.resolve();
	}
	await tick();
	await tick();
}

/**
 * @param {() => boolean} predicate
 * @param {number} [timeout]
 */
async function wait_for(predicate, timeout = 2000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		await run_gc();
		if (predicate()) return;
	}
	throw new Error('Timed out waiting for predicate');
}

describe('QueryProxy', () => {
	beforeEach(() => {
		// Clear the module-scoped cache map between tests
		query_map.clear();
	});

	test('constructing a proxy populates the cache', () => {
		const fn = () => Promise.resolve('value');
		new QueryProxy('q', undefined, fn);

		const entries = /** @type {Map<string, any>} */ (query_map.get('q'));
		expect(entries).toBeDefined();
		expect(entries.size).toBe(1);

		const [entry] = /** @type {Iterable<any>} */ (entries.values());
		expect(entry.proxy_count).toBe(1);
	});

	test('two proxies for the same (id, arg) share a single cache entry', () => {
		const fn = () => Promise.resolve('value');
		new QueryProxy('q', { x: 1 }, fn);
		new QueryProxy('q', { x: 1 }, fn);

		const entries = /** @type {Map<string, any>} */ (query_map.get('q'));
		expect(entries.size).toBe(1);

		const [entry] = /** @type {Iterable<any>} */ (entries.values());
		expect(entry.proxy_count).toBe(2);
	});

	test('proxies for different args produce different cache entries', () => {
		const fn = () => Promise.resolve('value');
		new QueryProxy('q', { x: 1 }, fn);
		new QueryProxy('q', { x: 2 }, fn);

		expect(query_map.get('q')?.size).toBe(2);
	});

	test('a proxy that goes out of scope is garbage collected and the cache entry is evicted', async () => {
		const fn = () => Promise.resolve('value');

		// Construct the proxy in a nested scope so V8's debug scope tracking can't
		// keep it alive in the surrounding closure.
		(() => {
			new QueryProxy('q', { name: 'echo' }, fn);
		})();

		expect(query_map.get('q')?.size).toBe(1);

		await wait_for(() => !query_map.has('q'));

		expect(query_map.has('q')).toBe(false);
	});

	test('the cached Query closure does not retain the QueryProxy', async () => {
		const fn = () => Promise.resolve('value');

		// Take a WeakRef to the proxy and a strong reference to its Query so we
		// can assert that the Query (which holds the captured `fn` closure) does
		// not keep the proxy alive.
		/** @type {WeakRef<any>} */
		let proxy_ref;
		/** @type {any} */
		let query;

		(() => {
			const proxy = new QueryProxy('q', 'arg', fn);
			proxy_ref = new WeakRef(proxy);
			const entries = /** @type {Map<string, any>} */ (query_map.get('q'));
			const [entry] = /** @type {Iterable<any>} */ (entries.values());
			query = entry.resource;
		})();

		// The Query is alive (we hold `query`), but the proxy should still be
		// GC-eligible because the Query's `fn` closure must not capture the proxy.
		await wait_for(() => proxy_ref.deref() === undefined);

		expect(proxy_ref.deref()).toBeUndefined();
		// The cache entry stays alive because we hold `query` (the resource), even
		// though the proxy has been collected. Hold a reference to keep the test
		// honest about what's being asserted.
		expect(query).toBeDefined();
	});

	test('two consecutive proxies for the same key are both eligible for GC', async () => {
		const fn = () => Promise.resolve('value');

		/** @type {WeakRef<any>} */
		let first_ref;
		/** @type {WeakRef<any>} */
		let second_ref;

		(() => {
			first_ref = new WeakRef(new QueryProxy('q', 'arg', fn));
		})();
		(() => {
			second_ref = new WeakRef(new QueryProxy('q', 'arg', fn));
		})();

		await wait_for(() => first_ref.deref() === undefined && second_ref.deref() === undefined);

		expect(first_ref.deref()).toBeUndefined();
		expect(second_ref.deref()).toBeUndefined();

		// Once both proxies are gone, the cache entry should evict itself.
		await tick();
		await tick();
		expect(query_map.has('q')).toBe(false);
	});

	test('manual_ref via withOverride keeps the cache entry alive past GC of the proxy', async () => {
		const fn = () => Promise.resolve('value');

		let release;

		(() => {
			const proxy = new QueryProxy('q', 'arg', fn);
			release = proxy.withOverride((v) => v);
		})();

		// Force GC; the cache entry should NOT be evicted because withOverride
		// took a manual_ref that we haven't released yet.
		await run_gc();
		await run_gc();

		expect(query_map.has('q')).toBe(true);
		const entries = /** @type {Map<string, any>} */ (query_map.get('q'));
		const [entry] = /** @type {Iterable<any>} */ (entries.values());
		// proxy_count: 1 from withOverride's manual_ref; the constructor's `ref` was
		// dropped when the proxy was GC'd.
		expect(entry.proxy_count).toBe(1);

		release?.();
		await tick();
		await tick();

		expect(query_map.has('q')).toBe(false);
	});
});
