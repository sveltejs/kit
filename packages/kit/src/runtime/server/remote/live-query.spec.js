import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { create_live_query_response } from './live-query.js';

/**
 * A generator whose yields are driven manually, so tests can control exactly
 * when (in fake time) the live query emits values.
 */
function controllable() {
	const END = Symbol('end');

	/** @type {any[]} */
	const queue = [];

	/** @type {(() => void) | null} */
	let notify = null;

	async function* gen() {
		while (true) {
			while (queue.length > 0) {
				const item = queue.shift();
				if (item === END) return;
				yield item;
			}

			await new Promise((resolve) => {
				notify = () => resolve(undefined);
			});
			notify = null;
		}
	}

	return {
		generator: gen(),
		/** @param {any} value */
		push(value) {
			queue.push(value);
			notify?.();
		},
		end() {
			queue.push(END);
			notify?.();
		}
	};
}

/**
 * @param {AbortSignal} [signal]
 */
function setup(signal = new AbortController().signal) {
	const { generator, push, end } = controllable();

	const response = create_live_query_response(
		signal,
		generator,
		(value) => JSON.stringify(value),
		(error) => ({ message: String(error) })
	);

	const reader = /** @type {ReadableStream<Uint8Array>} */ (response.body).getReader();
	const decoder = new TextDecoder();

	return {
		response,
		push,
		end,
		/** @returns {Promise<string | null>} the next decoded SSE block, or `null` if the stream closed */
		async next() {
			const { value, done } = await reader.read();
			return done ? null : decoder.decode(value);
		}
	};
}

describe('create_live_query_response keep-alive', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('sets the correct SSE headers', () => {
		const { response } = setup();
		expect(response.headers.get('content-type')).toBe('text/event-stream');
		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});

	test('sends a keep-alive comment after a period of inactivity, and repeats it', async () => {
		const harness = setup();

		harness.push({ count: 1 });
		expect(await harness.next()).toBe('data: {"type":"result","result":"{\\"count\\":1}"}\n\n');

		// nothing more is yielded — after the interval we expect a keep-alive comment
		await vi.advanceTimersByTimeAsync(30_000);
		expect(await harness.next()).toBe(': keep-alive\n\n');

		// ...and it keeps sending them while idle
		await vi.advanceTimersByTimeAsync(30_000);
		expect(await harness.next()).toBe(': keep-alive\n\n');
	});

	test('does not send a keep-alive when messages arrive more frequently than the interval', async () => {
		const harness = setup();

		harness.push({ count: 1 });
		expect(await harness.next()).toBe('data: {"type":"result","result":"{\\"count\\":1}"}\n\n');

		// a message arrives before the interval elapses, resetting the timer
		await vi.advanceTimersByTimeAsync(20_000);
		harness.push({ count: 2 });
		expect(await harness.next()).toBe('data: {"type":"result","result":"{\\"count\\":2}"}\n\n');

		// the next read must not resolve with a keep-alive within the interval...
		let settled = false;
		const pending = harness.next().then((value) => {
			settled = true;
			return value;
		});

		await vi.advanceTimersByTimeAsync(20_000);
		expect(settled).toBe(false);

		// ...it resolves with the next real message instead
		harness.push({ count: 3 });
		expect(await pending).toBe('data: {"type":"result","result":"{\\"count\\":3}"}\n\n');
	});

	test('stops sending keep-alive comments once the request is aborted', async () => {
		const controller = new AbortController();
		const harness = setup(controller.signal);

		harness.push({ count: 1 });
		expect(await harness.next()).toBe('data: {"type":"result","result":"{\\"count\\":1}"}\n\n');

		controller.abort();

		// the stream is torn down — the next read resolves as `done`
		expect(await harness.next()).toBe(null);

		// advancing past the interval must not throw (the keep-alive timer has been
		// cleared) and must not produce any further output
		await vi.advanceTimersByTimeAsync(60_000);
		expect(await harness.next()).toBe(null);
	});
});
