import { beforeAll, expect, test, vi } from 'vitest';

/** @type {typeof import('./remote-functions.js').create_live_query_response} */
let create_live_query_response;

beforeAll(async () => {
	vi.stubGlobal('__SVELTEKIT_DEV__', false);
	({ create_live_query_response } = await import('./remote-functions.js'));
});

/**
 * @param {(event: import('@sveltejs/kit').RequestEvent) => AsyncGenerator<any>} run
 */
function create_response(run) {
	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({
		request: new Request('http://localhost/_app/remote/test?payload=undefined')
	});

	return create_live_query_response(
		event,
		/** @type {import('types').RequestState} */ ({}),
		/** @type {import('types').SSROptions} */ ({}),
		/** @type {import('types').RemoteQueryLiveInternals} */ (/** @type {unknown} */ ({ run })),
		undefined
	);
}

// https://github.com/sveltejs/kit/issues/16778
test('cancellation ignores a value that arrives after generator.next()', async () => {
	/** @type {() => void} */
	let resume = () => {};
	const parked = new Promise((resolve) => (resume = () => resolve(undefined)));

	const response = create_response(async function* () {
		yield 'initial';
		await parked;
		yield 'late';
	});

	const reader = /** @type {ReadableStream<Uint8Array>} */ (response.body).getReader();
	await reader.read();
	const pending = reader.read();
	await Promise.resolve();

	await expect(reader.cancel()).resolves.toBeUndefined();
	await expect(pending).resolves.toEqual({ value: undefined, done: true });

	resume();
	await new Promise((resolve) => setTimeout(resolve, 0));
});

test('cancellation aborts the generator request signal and runs cleanup', async () => {
	const cleaned_up = vi.fn();

	const response = create_response(async function* (event) {
		try {
			yield 'initial';
			await new Promise((resolve) => event.request.signal.addEventListener('abort', resolve));
		} finally {
			cleaned_up();
		}
	});

	const reader = /** @type {ReadableStream<Uint8Array>} */ (response.body).getReader();
	await reader.read();
	const pending = reader.read();
	await Promise.resolve();

	await reader.cancel();
	await expect(pending).resolves.toEqual({ value: undefined, done: true });
	await vi.waitFor(() => expect(cleaned_up).toHaveBeenCalledOnce());
});
