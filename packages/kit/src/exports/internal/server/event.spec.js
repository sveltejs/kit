import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.doUnmock('node:async_hooks');
	vi.doUnmock('../../../constants.js');
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

test.each([
	{ als: true, webcontainer: false },
	{ als: false, webcontainer: false },
	{ als: true, webcontainer: true },
	{ als: false, webcontainer: true }
])(
	'temporary re-entry restores context (ALS: $als, WebContainer: $webcontainer)',
	async ({ als, webcontainer }) => {
		if (!als) {
			vi.doMock('node:async_hooks', () => {
				throw new Error('not available');
			});
		}
		vi.doMock('../../../constants.js', async (importOriginal) => ({
			...(await importOriginal()),
			IN_WEBCONTAINER: webcontainer
		}));
		const { get_request_store, try_get_request_store, with_request_store } =
			await import('./event.js');
		await settle();

		const outer = /** @type {any} */ ({ event: {}, state: {} });
		const inner = /** @type {any} */ ({ event: {}, state: {} });
		const error = new Error('fetch failed');
		with_request_store(outer, () => {
			with_request_store(inner, () => expect(get_request_store()).toBe(inner), true);
			expect(get_request_store()).toBe(outer);
			expect(() =>
				with_request_store(
					inner,
					() => {
						throw error;
					},
					true
				)
			).toThrow(error);
			expect(get_request_store()).toBe(outer);
			with_request_store(null, () => expect(try_get_request_store()).toBeNull(), true);
			expect(get_request_store()).toBe(outer);
		});

		// Existing callers still clear their store, except for the WebContainer workaround.
		expect(try_get_request_store()).toBe(webcontainer ? outer : null);
		with_request_store(null, () => {});
		with_request_store(inner, () => expect(get_request_store()).toBe(inner), true);
		expect(try_get_request_store()).toBeNull();
	}
);
