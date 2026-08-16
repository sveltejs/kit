import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simulate a WebContainer environment before any modules are evaluated.
// IN_WEBCONTAINER is evaluated at import time from constants.js, so this must run first.
vi.hoisted(() => {
	if (!globalThis.process) globalThis.process = /** @type {any} */ ({});
	if (!globalThis.process.versions) globalThis.process.versions = {};
	// @ts-ignore — non-standard field
	globalThis.process.versions.webcontainer = '1.0.0';
});

// Prevent AsyncLocalStorage from being created so that `sync_store` is the
// only context carrier — which is exactly the condition under which the bug
// (stale is_in_remote_query after await) manifests.
vi.mock('node:async_hooks', () => ({}));

import { with_request_store, try_get_request_store } from './event.js';

/** @returns {import('types').RequestStore} */
function make_store(is_in_remote_query = false) {
	return /** @type {any} */ ({
		event: {},
		state: { is_in_remote_query, is_in_remote_function: false }
	});
}

describe('with_request_store (WebContainer / no AsyncLocalStorage)', () => {
	beforeEach(() => {
		// Reset sync_store to null between tests by calling with_request_store(null, () => {})
		with_request_store(null, () => {});
	});

	it('restores the outer store after a synchronous fn', () => {
		const outer = make_store(false);
		const inner = make_store(true);

		with_request_store(outer, () => {
			with_request_store(inner, () => {
				expect(try_get_request_store()).toBe(inner);
			});
			// After the inner synchronous call, outer store should be visible again.
			expect(try_get_request_store()).toBe(outer);
		});
	});

	it('restores the outer store after an async fn (Promise) resolves', async () => {
		const outer = make_store(false);
		const query_store = make_store(true);

		await with_request_store(outer, async () => {
			// Simulate run_remote_function: nested with_request_store with query state.
			await with_request_store(query_store, async () => {
				await Promise.resolve(); // yields the microtask queue
				expect(try_get_request_store()).toBe(query_store);
			});

			// After the query Promise resolves, the outer store must be visible again.
			// Without the fix, sync_store is stuck at query_store (is_in_remote_query: true).
			const store = try_get_request_store();
			expect(store).toBe(outer);
			expect(store?.state?.is_in_remote_query).toBe(false);
		});
	});

	it('restores null when there was no outer store', async () => {
		// Ensure no leakage when with_request_store is used at the top level.
		await with_request_store(make_store(true), async () => {
			await Promise.resolve();
		});

		expect(try_get_request_store()).toBeNull();
	});

	it('does not clobber a concurrently-set store on early resolution', () => {
		// If sync_store was changed by another call between fn() starting and settling,
		// the guard `if (sync_store === store)` must prevent the .finally() from
		// overwriting the newer store.
		const store_a = make_store(false);
		const store_b = make_store(false);

		let resolve_a = /** @type {() => void} */ (() => {});
		const promise_a = new Promise((res) => (resolve_a = res));

		// Start call A without awaiting.
		const result_a = with_request_store(store_a, () => promise_a);

		// Override sync_store with store_b (simulating a second concurrent top-level call).
		with_request_store(store_b, () => {});

		// When A's promise resolves, it must not revert sync_store back to store_a's previous.
		resolve_a();
		return result_a.then(() => {
			// store_b's previous (null) was restored by its own synchronous with_request_store call,
			// so sync_store == null at this point. The guard ensures A's .finally() did not
			// accidentally restore store_a (which would be wrong).
			expect(try_get_request_store()).toBeNull();
		});
	});
});
