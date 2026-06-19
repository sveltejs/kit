/** @import { RequestStore } from 'types' */
import { describe, expect, test } from 'vitest';
import {
	with_request_store,
	with_request_store_disposable,
	try_get_request_store,
	getRequestEvent
} from './event.js';

/** @returns {RequestStore} */
function make_store() {
	return {
		event: /** @type {any} */ ({ url: 'http://localhost/' }),
		state: /** @type {any} */ ({})
	};
}

describe('with_request_store', () => {
	test('exposes store via try_get_request_store during sync execution', () => {
		const store = make_store();
		let seen = null;
		with_request_store(store, () => {
			seen = try_get_request_store();
		});
		expect(seen).toBe(store);
	});

	test('exposes store via try_get_request_store during async execution', async () => {
		const store = make_store();
		let seen = null;
		await with_request_store(store, async () => {
			await Promise.resolve();
			seen = try_get_request_store();
		});
		expect(seen).toBe(store);
	});

	test('returns null from try_get_request_store after sync execution completes', () => {
		const store = make_store();
		with_request_store(store, () => {});
		expect(try_get_request_store()).toBeNull();
	});

	test('returns null from try_get_request_store after async execution completes', async () => {
		const store = make_store();
		// Use Promise.resolve() rather than async/await to return a thenable without
		// triggering the require-await lint rule on a trivial async arrow.
		await with_request_store(store, () => Promise.resolve('rendered'));
		expect(try_get_request_store()).toBeNull();
	});

	// Regression test for https://github.com/sveltejs/kit/issues/15764
	// Async resources created inside als.run() inherit kResourceStore and can retain the
	// RequestStore after the render completes (Node.js AsyncLocalStorage leak). The fix wraps
	// the store in a container object; the render path calls dispose() once rendering is done,
	// nulling the container so the store can be collected.
	test('async continuations created inside render cannot access store after dispose', async () => {
		const store = make_store();
		let store_seen_in_continuation = /** @type {RequestStore | null | undefined} */ (undefined);

		// Simulate what Svelte 4's component_subscribe does: create a Promise-based
		// callback inside the ALS context that outlives the render.
		let late_callback_promise = Promise.resolve(); // typed; overwritten inside render fn

		const { result, dispose } = with_request_store_disposable(store, async () => {
			await Promise.resolve(); // ensure the async code path through with_request_store
			late_callback_promise = new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
				// Without the fix, try_get_request_store() returns `store` here; with the fix the
				// container has been nulled by dispose(), so it returns null.
				store_seen_in_continuation = try_get_request_store();
			});
		});
		await result;
		dispose();

		await late_callback_promise;

		expect(store_seen_in_continuation).toBeNull();
	});

	// Regression test for the streaming-SSR boundary raised in PR #15770 review: disposal is
	// caller-controlled, not triggered when the render promise settles. An async resource created
	// during render that runs after the render promise resolves but before dispose() (e.g. a
	// streamed chunk being flushed) must still see the store.
	test('async continuations still see the store after render resolves but before dispose', async () => {
		const store = make_store();
		let store_seen_during_stream = /** @type {RequestStore | null | undefined} */ (undefined);

		// A continuation created inside render that fires after the render promise resolves,
		// mimicking a streamed chunk flushed once the initial render is done.
		let streamed = Promise.resolve(); // typed; overwritten inside render fn

		const { result, dispose } = with_request_store_disposable(store, async () => {
			await Promise.resolve(); // exercise the async path through with_request_store
			streamed = new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
				store_seen_during_stream = try_get_request_store();
			});
		});
		await result;

		// the render promise has resolved and the "stream" continuation runs here, before dispose()
		await streamed;
		expect(store_seen_during_stream).toBe(store);

		dispose();
	});

	test('getRequestEvent returns event during execution', () => {
		const store = make_store();
		let event = null;
		with_request_store(store, () => {
			event = getRequestEvent();
		});
		expect(event).toBe(store.event);
	});

	test('getRequestEvent throws outside execution context', () => {
		expect(() => getRequestEvent()).toThrowError('Can only read the current request event');
	});

	test('nested with_request_store calls use innermost store', async () => {
		const outer = make_store();
		const inner = make_store();
		let seen_in_inner = null;
		let seen_after_inner = null;

		await with_request_store(outer, async () => {
			await Promise.resolve(); // exercise the async path
			with_request_store(inner, () => {
				seen_in_inner = try_get_request_store();
			});
			seen_after_inner = try_get_request_store();
		});

		expect(seen_in_inner).toBe(inner);
		expect(seen_after_inner).toBe(outer);
	});
});
