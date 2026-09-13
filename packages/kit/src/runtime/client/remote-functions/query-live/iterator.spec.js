import { afterEach, describe, expect, test, vi } from 'vitest';
import { stringify } from 'devalue';

vi.mock(new URL('../../client.js', import.meta.url).pathname, () => ({
	app: { decoders: {} }
}));

vi.mock('#app/state/client', () => ({ notify_version: () => {} }));

vi.mock(new URL('../shared.svelte.js', import.meta.url).pathname, () => ({
	handle_side_channel_response: vi.fn()
}));

const { create_live_iterator } = await import('./iterator.js');
const { handle_side_channel_response } = await import('../shared.svelte.js');

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('create_live_iterator', () => {
	test('receives live results when the server negotiates event streams', async () => {
		const cancel = vi.fn();
		const value = { count: 1 };
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(
					new TextEncoder().encode(
						`data: ${JSON.stringify({ type: 'result', result: stringify(value) })}\n\n`
					)
				);
			},
			cancel
		});

		/** @type {typeof fetch} */
		const negotiated_fetch = (_input, init) => {
			if (new Headers(init?.headers).get('accept') !== 'text/event-stream') {
				return Promise.resolve(new Response(null, { status: 406, statusText: 'Not Acceptable' }));
			}
			return Promise.resolve(
				new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
			);
		};
		vi.stubGlobal('fetch', negotiated_fetch);

		const iterator = create_live_iterator('hash/live', '');
		try {
			await expect(iterator.next()).resolves.toEqual({ value, done: false });
		} finally {
			await iterator.return(undefined);
		}
		expect(cancel).toHaveBeenCalledOnce();
	});

	test('handles JSON side-channel responses from hooks', async () => {
		const redirect = { type: 'redirect', location: '/login' };
		vi.stubGlobal('fetch', () => Promise.resolve(Response.json(redirect)));

		await expect(create_live_iterator('hash/live', '').next()).rejects.toMatchObject({
			status: 500
		});
		expect(handle_side_channel_response).toHaveBeenCalledWith(redirect);
	});
});
