import { beforeAll, expect, test, vi } from 'vitest';
import { init_transport } from '#app/internal/transport';

const decoder = new TextDecoder();

/** @type {typeof import('./remote-functions.js').create_live_query_response} */
let create_live_query_response;
/** @type {typeof import('./internal.js').set_hooks} */
let set_hooks;

beforeAll(async () => {
	vi.stubGlobal('__SVELTEKIT_DEV__', false);
	init_transport({});
	({ create_live_query_response } = await import('./remote-functions.js'));
	({ set_hooks } = await import('./internal.js'));
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
		/** @type {import('types').RemoteQueryLiveInternals} */ (/** @type {unknown} */ ({ run })),
		undefined
	);
}

// https://github.com/sveltejs/kit/issues/16778
test('cancellation ignores a value that arrives after generator.next()', async () => {
	const handle_error = vi.fn(() => ({ message: 'oops' }));
	set_hooks(/** @type {any} */ ({ handleError: handle_error }));
	/** @type {() => void} */
	let resume = () => {};
	const parked = new Promise((resolve) => (resume = () => resolve(undefined)));
	/** @type {() => void} */
	let did_park = () => {};
	const parked_on_next = new Promise((resolve) => (did_park = () => resolve(undefined)));

	const response = create_response(async function* () {
		yield 'initial';
		did_park();
		await parked;
		yield 'late';
	});

	const reader = /** @type {ReadableStream<Uint8Array>} */ (response.body).getReader();
	const first = await reader.read();
	expect(decoder.decode(first.value)).toBe(
		'data: {"type":"result","result":"[\\"initial\\"]"}\n\n'
	);
	const pending = reader.read();
	await parked_on_next;

	await expect(reader.cancel()).resolves.toBeUndefined();
	await expect(pending).resolves.toEqual({ value: undefined, done: true });

	resume();
	await new Promise((resolve) => setTimeout(resolve, 0));

	// enqueueing the late value would throw and route through handleError
	expect(handle_error).not.toHaveBeenCalled();
});

test('cancellation aborts the generator request signal and runs cleanup', async () => {
	const cleaned_up = vi.fn();
	/** @type {() => void} */
	let did_park = () => {};
	const parked_on_next = new Promise((resolve) => (did_park = () => resolve(undefined)));

	const response = create_response(async function* (event) {
		try {
			yield 'initial';
			did_park();
			await new Promise((resolve) => event.request.signal.addEventListener('abort', resolve));
		} finally {
			cleaned_up();
		}
	});

	const reader = /** @type {ReadableStream<Uint8Array>} */ (response.body).getReader();
	const first = await reader.read();
	expect(decoder.decode(first.value)).toBe(
		'data: {"type":"result","result":"[\\"initial\\"]"}\n\n'
	);
	const pending = reader.read();
	await parked_on_next;

	await reader.cancel();
	await expect(pending).resolves.toEqual({ value: undefined, done: true });
	await vi.waitFor(() => expect(cleaned_up).toHaveBeenCalledOnce());
});
