/** @import { RequestState } from 'types' */
import { expect, test, vi } from 'vitest';
import { RequestEvent, with_request_store } from '@sveltejs/kit/internal/server';
import { init_transport } from '#app/internal/transport';

vi.stubGlobal('__SVELTEKIT_DEV__', false);
vi.stubGlobal('__SVELTEKIT_APP_VERSION__', 'test');

init_transport({});

const { command } = await import('./command.js');
const { query } = await import('./query.js');
const { requested } = await import('./requested.js');

/**
 * By default this mimics a request that did not come through the `/_app/remote/...`
 * endpoint, e.g. a `POST` handler in a `+server.js` file that calls a command directly
 * @param {Record<string, any>} [remote]
 * @param {boolean} [is_remote_request]
 */
function setup(remote = {}, is_remote_request = false) {
	const get_items = query(() => ['a', 'b']);
	/** @type {any} */ (get_items).__.id = 'hash/get_items';

	return {
		get_items,
		store: {
			event: new RequestEvent(
				/** @type {import('@sveltejs/kit').RequestEvent} */ (
					/** @type {unknown} */ ({
						request: new Request('http://localhost/api/add', { method: 'POST' }),
						isRemoteRequest: is_remote_request,
						cookies: {}
					})
				),
				0
			),
			state: /** @type {RequestState} */ (/** @type {unknown} */ ({ remote }))
		}
	};
}

// https://github.com/sveltejs/kit/issues/17035
test('requested() yields nothing when the command was not called via the remote endpoint', async () => {
	const { get_items, store } = setup();

	const add = command(async () => {
		const entries = [...requested(get_items, 1)];
		await requested(get_items, 1).refreshAll();
		return entries.length;
	});

	await expect(with_request_store(store, () => add())).resolves.toBe(0);
});

test('requested() throws when called outside a command or form', () => {
	const { get_items, store } = setup();

	expect(() => with_request_store(store, () => requested(get_items, 1))).toThrow(
		'requested(...) can only be called in the context of a command/form remote function'
	);
});

test('requested() still yields the queries the client asked to refresh', async () => {
	const { get_items, store } = setup(
		{ requested: new Map([['hash/get_items', new Set([''])]]) },
		true
	);

	const add = command(() => [...requested(get_items, 1)].map(({ arg }) => arg));

	await expect(with_request_store(store, () => add())).resolves.toEqual([undefined]);
});
