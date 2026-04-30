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
	goto: () => Promise.resolve()
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

vi.mock(new URL('./instance.svelte.js', import.meta.url).pathname, () => {
	class LiveQuery {
		/**
		 * @param {string} id
		 * @param {string} key
		 * @param {string} payload
		 */
		constructor(id, key, payload) {
			this.id = id;
			this.key = key;
			this.payload = payload;
			this.destroyed = false;
		}
		destroy() {
			this.destroyed = true;
		}
	}
	return { LiveQuery };
});

// Stub the iterator helper so the proxy can be constructed without fetching.
vi.mock(new URL('./iterator.js', import.meta.url).pathname, () => ({
	async *create_live_iterator() {}
}));

const { LiveQueryProxy } = await import('./proxy.js');
const { live_query_map } = await import('../../client.js');

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

describe('LiveQueryProxy', () => {
	beforeEach(() => {
		live_query_map.clear();
	});

	test('constructing a proxy populates the cache', () => {
		new LiveQueryProxy('q', 'arg');

		const entries = /** @type {Map<string, any>} */ (live_query_map.get('q'));
		expect(entries).toBeDefined();
		expect(entries.size).toBe(1);

		const [entry] = /** @type {Iterable<any>} */ (entries.values());
		expect(entry.proxy_count).toBe(1);
	});

	test('two proxies for the same (id, arg) share a single cache entry', () => {
		new LiveQueryProxy('q', 'arg');
		new LiveQueryProxy('q', 'arg');

		const entries = /** @type {Map<string, any>} */ (live_query_map.get('q'));
		expect(entries.size).toBe(1);

		const [entry] = /** @type {Iterable<any>} */ (entries.values());
		expect(entry.proxy_count).toBe(2);
	});

	test('a proxy that goes out of scope is garbage collected and the cache entry is evicted', async () => {
		(() => {
			new LiveQueryProxy('q', { name: 'sub' });
		})();

		expect(live_query_map.get('q')?.size).toBe(1);

		await wait_for(() => !live_query_map.has('q'));

		expect(live_query_map.has('q')).toBe(false);
	});

	test('the cached LiveQuery does not retain the LiveQueryProxy', async () => {
		/** @type {WeakRef<any>} */
		let proxy_ref;
		/** @type {any} */
		let live_query;

		(() => {
			const proxy = new LiveQueryProxy('q', 'arg');
			proxy_ref = new WeakRef(proxy);
			const entries = /** @type {Map<string, any>} */ (live_query_map.get('q'));
			const [entry] = /** @type {Iterable<any>} */ (entries.values());
			live_query = entry.resource;
		})();

		await wait_for(() => proxy_ref.deref() === undefined);

		expect(proxy_ref.deref()).toBeUndefined();
		expect(live_query).toBeDefined();
	});

	test('eviction calls destroy() on the LiveQuery instance', async () => {
		/** @type {any} */
		let live_query;

		(() => {
			new LiveQueryProxy('q', 'arg');
			const entries = /** @type {Map<string, any>} */ (live_query_map.get('q'));
			const [entry] = /** @type {Iterable<any>} */ (entries.values());
			live_query = entry.resource;
		})();

		expect(live_query.destroyed).toBe(false);

		await wait_for(() => live_query.destroyed);

		expect(live_query.destroyed).toBe(true);
		expect(live_query_map.has('q')).toBe(false);
	});
});
