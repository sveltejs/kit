import { afterEach, describe, expect, test, vi } from 'vitest';
import { HandledHttpError, HttpError } from '@sveltejs/kit/internal';

vi.mock(new URL('../../client.js', import.meta.url).pathname, () => ({
	app: { decoders: {} }
}));

vi.mock('#app/state/client', () => ({
	notify_version: () => {}
}));

vi.mock(new URL('../shared.svelte.js', import.meta.url).pathname, () => ({
	handle_side_channel_response: () => Promise.resolve()
}));

const { create_live_iterator } = await import('./iterator.js');

/** @param {Response} response */
async function first_error(response) {
	vi.stubGlobal('fetch', () => Promise.resolve(response));
	return create_live_iterator('id', '')
		.next()
		.catch((error) => error);
}

describe('create_live_iterator errors', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('a response without a SvelteKit error body is a plain HttpError', async () => {
		const error = await first_error(
			new Response('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' })
		);

		expect(error).toBeInstanceOf(HttpError);
		expect(error).not.toBeInstanceOf(HandledHttpError);
		expect(error.status).toBe(502);
	});

	test('an error from the remote function is a HandledHttpError', async () => {
		const error = await first_error(
			Response.json(
				{ type: 'error', status: 503, error: { status: 503, message: 'Maintenance' } },
				{ status: 503 }
			)
		);

		expect(error).toBeInstanceOf(HandledHttpError);
		expect(error.status).toBe(503);
		expect(error.body).toEqual({ status: 503, message: 'Maintenance' });
	});
});
