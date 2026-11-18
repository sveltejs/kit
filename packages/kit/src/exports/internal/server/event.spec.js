import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.doUnmock('node:async_hooks');
	vi.resetModules();
});

/** Waits for `event.js` to find out whether `AsyncLocalStorage` is available */
function settle() {
	return new Promise((resolve) => setTimeout(resolve));
}

test('explains where the request event can be read', async () => {
	const { getRequestEvent } = await import('./event.js');
	await settle();

	expect(() => getRequestEvent()).toThrowKitError('request_event_unavailable');
});

test('explains that the request event must be read synchronously without AsyncLocalStorage', async () => {
	vi.doMock('node:async_hooks', () => {
		throw new Error('not available');
	});
	const { getRequestEvent, get_request_store, with_request_store } = await import('./event.js');
	await settle();

	expect(() => getRequestEvent()).toThrowKitError('request_event_after_await');
	expect(() => get_request_store()).toThrowKitError('request_store_after_await');

	const store = /** @type {any} */ ({ event: {}, state: {} });
	expect(with_request_store(store, () => getRequestEvent())).toBe(store.event);
});
