import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { HandledHttpError, HttpError } from '@sveltejs/kit/internal';

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery and resolves `$app/paths` to a server-side
// virtual module that only exists during a real SvelteKit build.
vi.mock(new URL('../../client.js', import.meta.url).pathname, async () => {
	const { HttpError } = await import('@sveltejs/kit/internal');
	return {
		query_responses: {},
		handle_error: (/** @type {any} */ error) =>
			Promise.resolve(
				error instanceof HttpError
					? error.body
					: { message: error?.message ?? String(error), status: 500 }
			)
	};
});

/**
 * Each connection the live query makes takes the next of these. A connection
 * yields its values, then throws its error (if any), otherwise stays open.
 * @type {Array<{ values: any[], error?: unknown }>}
 */
let connections = [];

vi.mock(new URL('./iterator.js', import.meta.url).pathname, () => ({
	async *create_live_iterator(
		/** @type {string} */ _id,
		/** @type {string} */ _payload,
		/** @type {AbortController} */ controller,
		/** @type {() => void} */ on_connect
	) {
		const connection = connections.shift();
		if (!connection) throw new Error('Unexpected connection');

		on_connect();

		for (const value of connection.values) {
			yield value;
		}

		if (connection.error) throw connection.error;

		// stay connected until the live query is interrupted or destroyed
		await new Promise((resolve) => controller.signal.addEventListener('abort', resolve));
		throw new DOMException('Aborted', 'AbortError');
	}
}));

const { LiveQuery } = await import('./instance.svelte.js');

/**
 * @param {() => boolean} predicate
 * @param {number} [timeout]
 */
async function wait_for(predicate, timeout = 2000) {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeout) throw new Error('Timed out waiting for predicate');
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

describe('LiveQuery reconnection', () => {
	beforeEach(() => {
		connections = [];
		vi.stubGlobal('navigator', { onLine: true });
		vi.stubGlobal('location', { href: 'http://localhost/' });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test.each([502, 503, 504])(
		'reconnects after a %i from something in front of the server',
		async (status) => {
			connections.push(
				{ values: [1], error: new HttpError({ status, message: 'Gateway' }) },
				{ values: [2] }
			);

			const live = new LiveQuery('id', 'id/payload', 'payload');
			expect(await live).toBe(1);

			await wait_for(() => live.current === 2);
			expect(live.error).toBeUndefined();
			expect(live.connected).toBe(true);
			expect(connections).toEqual([]);

			live.destroy();
		}
	);

	test('stops after a 503 the app threw itself', async () => {
		connections.push(
			{ values: [1], error: new HandledHttpError({ status: 503, message: 'Maintenance' }) },
			{ values: [2] }
		);

		const live = new LiveQuery('id', 'id/payload', 'payload');
		expect(await live).toBe(1);

		await wait_for(() => live.error !== undefined);
		expect(live.error).toEqual({ status: 503, message: 'Maintenance' });
		expect(connections).toHaveLength(1);

		live.destroy();
	});

	test('stops after other HTTP errors', async () => {
		connections.push(
			{ values: [1], error: new HttpError({ status: 500, message: 'Internal Error' }) },
			{ values: [2] }
		);

		const live = new LiveQuery('id', 'id/payload', 'payload');
		expect(await live).toBe(1);

		await wait_for(() => live.error !== undefined);
		expect(live.error).toEqual({ status: 500, message: 'Internal Error' });
		expect(connections).toHaveLength(1);

		live.destroy();
	});
});
