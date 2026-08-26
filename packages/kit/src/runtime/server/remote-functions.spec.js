import { beforeAll, expect, test, vi } from 'vitest';
import { init_transport, parse } from '#app/internal/transport';
import { get_request_store } from '@sveltejs/kit/internal/server';

const decoder = new TextDecoder();

/** @type {typeof import('./remote-functions.js').create_live_query_response} */
let create_live_query_response;
/** @type {typeof import('./remote-functions.js').handle_remote_call} */
let handle_remote_call;
/** @type {typeof import('./internal.js').set_hooks} */
let set_hooks;

beforeAll(async () => {
	vi.stubGlobal('__SVELTEKIT_DEV__', false);
	init_transport({});
	({ create_live_query_response, handle_remote_call } = await import('./remote-functions.js'));
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

test('serializes explicitly ignored requested updates', async () => {
	const command = () => {
		get_request_store().state.remote.ignored = new Set(['hash/query/[-1]']);
		return null;
	};
	Object.assign(command, { __: { type: 'command', name: 'command', fn: command } });

	const response = await handle_remote_call(
		/** @type {any} */ ({
			request: new Request('http://localhost/_app/remote/hash/command', {
				method: 'POST',
				body: JSON.stringify({ payload: '', refreshes: ['hash/query/[-1]'] })
			}),
			tracing: { current: { setAttributes: vi.fn() } }
		}),
		/** @type {any} */ ({ remote: { requested: null, ignored: null } }),
		/** @type {any} */ ({
			remotes: {
				hash: () => Promise.resolve({ default: { command } })
			}
		}),
		'hash/command'
	);

	const result = await response.json();
	expect(parse(result.data)).toEqual({ _: null, i: ['hash/query/[-1]'] });
});
