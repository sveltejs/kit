import { describe, expect, test, beforeEach } from 'vitest';
import { tick } from 'svelte';
import { CacheController } from './cache.svelte.js';

/**
 * Run garbage collection a handful of times. V8 sometimes needs more than one pass
 * before a recently-allocated object is reclaimed. After each pass we yield to the
 * microtask queue so any FinalizationRegistry callbacks (which are scheduled as
 * tasks/microtasks after a sweep) get a chance to run.
 */
async function run_gc() {
	for (let i = 0; i < 4; i++) {
		/** @type {() => void} */ (/** @type {any} */ (globalThis).gc)();
		// FinalizationRegistry callbacks run on a separate task queue; yield twice to
		// pick up both microtasks and the next macrotask.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await tick();
	}
	// Flush the deferred eviction (`tick().then(...)`) inside `deref`.
	await tick();
	await tick();
}

/**
 * Wait for the FinalizationRegistry to observe `anchor` as unreachable and run the
 * `deref` callback. We poll up to `timeout` ms because GC scheduling is non-deterministic.
 *
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

describe('CacheController', () => {
	/** @type {Map<string, Map<string, import('./cache.svelte.js').CacheEntry<{ id: string, destroyed: boolean }>>>} */
	let cache_map;
	/** @type {Array<{ id: string, destroyed: boolean }>} */
	let destroyed;
	/** @type {CacheController<{ id: string, destroyed: boolean }>} */
	let cache;

	beforeEach(() => {
		cache_map = new Map();
		destroyed = [];
		cache = new CacheController(cache_map, (resource) => {
			resource.destroyed = true;
			destroyed.push(resource);
		});
	});

	test('ensure_entry creates a single entry per (id, payload)', () => {
		let constructions = 0;
		const factory = () => {
			constructions++;
			return { id: 'x', destroyed: false };
		};

		const a = cache.ensure_entry('q', 'p', factory);
		const b = cache.ensure_entry('q', 'p', factory);
		const c = cache.ensure_entry('q', 'other', factory);

		expect(constructions).toBe(2);
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(cache_map.get('q')?.size).toBe(2);
	});

	test('ref increments proxy_count', () => {
		const entry = cache.ensure_entry('q', 'p', () => ({ id: 'x', destroyed: false }));
		expect(entry.proxy_count).toBe(0);

		const anchor = {};
		cache.ref(anchor, entry, 'q', 'p');

		expect(entry.proxy_count).toBe(1);
	});

	test('manual_ref increments and the returned deref decrements proxy_count', async () => {
		const entry = cache.ensure_entry('q', 'p', () => ({ id: 'x', destroyed: false }));
		const release = cache.manual_ref(entry, 'q', 'p');
		expect(entry.proxy_count).toBe(1);

		release();
		expect(entry.proxy_count).toBe(0);

		// Eviction is deferred via tick().then(...); pump microtasks
		await tick();
		await tick();

		expect(cache_map.get('q')?.get('p')).toBeUndefined();
		expect(destroyed).toHaveLength(1);
	});

	test('eviction calls destroy_resource and the $effect.root cleanup', async () => {
		const entry = cache.ensure_entry('q', 'p', () => ({ id: 'x', destroyed: false }));
		const release = cache.manual_ref(entry, 'q', 'p');

		release();
		await tick();
		await tick();

		expect(entry.resource.destroyed).toBe(true);
		expect(cache_map.has('q')).toBe(false);
	});

	test('entry survives while at least one ref is alive', async () => {
		const entry = cache.ensure_entry('q', 'p', () => ({ id: 'x', destroyed: false }));
		const release_a = cache.manual_ref(entry, 'q', 'p');
		const release_b = cache.manual_ref(entry, 'q', 'p');

		release_a();
		await tick();
		await tick();

		expect(cache_map.get('q')?.get('p')).toBe(entry);
		expect(entry.proxy_count).toBe(1);

		release_b();
		await tick();
		await tick();

		expect(cache_map.get('q')?.get('p')).toBeUndefined();
	});

	test('FinalizationRegistry evicts the entry when the anchor is garbage collected', async () => {
		const entry = cache.ensure_entry('q', 'p', () => ({ id: 'x', destroyed: false }));

		// Create the anchor inside an IIFE so it has no name in the surrounding scope.
		// (Otherwise V8's debug scope tracking can keep it alive.)
		(() => {
			const anchor = {};
			cache.ref(anchor, entry, 'q', 'p');
		})();

		expect(entry.proxy_count).toBe(1);
		expect(cache_map.get('q')?.get('p')).toBe(entry);

		await wait_for(() => !cache_map.get('q')?.has('p'));

		expect(cache_map.has('q')).toBe(false);
		expect(entry.resource.destroyed).toBe(true);
	});

	test('entry is retained while any anchor is reachable', async () => {
		const entry = cache.ensure_entry('q', 'p', () => ({ id: 'x', destroyed: false }));

		const live_anchor = {};
		cache.ref(live_anchor, entry, 'q', 'p');

		// A second anchor that goes out of scope immediately
		(() => {
			const ephemeral = {};
			cache.ref(ephemeral, entry, 'q', 'p');
		})();

		expect(entry.proxy_count).toBe(2);

		// The ephemeral anchor should be GC'd, dropping the count to 1
		await wait_for(() => entry.proxy_count === 1);

		expect(entry.proxy_count).toBe(1);
		expect(cache_map.get('q')?.get('p')).toBe(entry);
		expect(entry.resource.destroyed).toBe(false);

		// `live_anchor` is still in scope; entry must persist
		expect(live_anchor).toBeDefined();
	});

	test('refs to different (id, payload) pairs are independent', async () => {
		const entry_a = cache.ensure_entry('q', 'p1', () => ({ id: 'a', destroyed: false }));
		const entry_b = cache.ensure_entry('q', 'p2', () => ({ id: 'b', destroyed: false }));

		const live_anchor = {};
		cache.ref(live_anchor, entry_b, 'q', 'p2');

		(() => {
			const ephemeral = {};
			cache.ref(ephemeral, entry_a, 'q', 'p1');
		})();

		await wait_for(() => !cache_map.get('q')?.has('p1'));

		expect(cache_map.get('q')?.has('p1')).toBe(false);
		expect(cache_map.get('q')?.get('p2')).toBe(entry_b);
		expect(entry_a.resource.destroyed).toBe(true);
		expect(entry_b.resource.destroyed).toBe(false);

		expect(live_anchor).toBeDefined();
	});
});
