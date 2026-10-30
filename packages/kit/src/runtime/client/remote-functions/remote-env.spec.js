import * as devalue from 'devalue';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { create_remote_key } from '../../shared.js';
import { reset_remote_state, set_remote_env } from '@sveltejs/kit/internal/client';

// Mock `client.js` with only the module state the remote functions share with the
// router. It has no `app`, `_goto`, `handle_error` or `refreshAll`, which shows
// that the remote functions work without `start()` once the env is set.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	query_map: new Map(),
	live_query_map: new Map(),
	query_responses: {},
	prerender_responses: {},
	set_nearest_error_page: () => {}
}));

// `prerender.svelte.js` reads this build-time constant at module scope, and opens
// its Cache API store on import. jsdom has no Cache API, so give it an in-memory one.
// Like the real one, `put` lands later (here: on the next macrotask)
/** @type {Map<string, Response>} */
const cache_store = new Map();
const globals = /** @type {any} */ (globalThis);
globals.__SVELTEKIT_DEV__ = false;
globals.caches = {
	open: () =>
		Promise.resolve({
			match: (/** @type {string} */ url) => Promise.resolve(cache_store.get(url)?.clone()),
			put: (/** @type {string} */ url, /** @type {Response} */ response) =>
				new Promise((resolve) => {
					setTimeout(() => resolve(void cache_store.set(url, response)), 0);
				}),
			keys: () => Promise.resolve(Array.from(cache_store.keys())),
			delete: (/** @type {string} */ url) => Promise.resolve(cache_store.delete(url))
		}),
	keys: () => Promise.resolve([]),
	delete: () => Promise.resolve(true)
};

const { query } = await import('./query/index.js');
const { query_live } = await import('./query-live/index.js');
const { form } = await import('./form.svelte.js');
const { command } = await import('./command.svelte.js');
const { prerender } = await import('./prerender.svelte.js');
const { query_responses } = await import('../client.js');

class Point {
	/** @param {number} x */
	constructor(x) {
		this.x = x;
	}
}

const decoders = { Point: (/** @type {number} */ x) => new Point(x) };
const encoders = { Point: (/** @type {any} */ value) => value instanceof Point && value.x };

/** @type {ReturnType<typeof create_env>} */
let env;

function create_env() {
	return {
		fetch: vi.fn(),
		decoders,
		encoders,
		page: { url: new URL('http://localhost/posts?page=2') },
		navigating: null,
		goto: vi.fn(() => Promise.resolve()),
		refresh_all: vi.fn(() => Promise.resolve()),
		handle_error: vi.fn((/** @type {any} */ error) =>
			Promise.resolve({ status: 500, message: error.message })
		),
		notify_version: vi.fn()
	};
}

/** @param {Record<string, any>} data */
function result(data) {
	return Response.json({ type: 'result', data: devalue.stringify(data, encoders) });
}

beforeEach(() => {
	env = create_env();
	set_remote_env(env);
	vi.stubGlobal('fetch', () => {
		throw new Error('the global fetch should not be called');
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('a query resolves through the injected fetch and decoders', async () => {
	const key = create_remote_key('hash/getPoint', '');
	env.fetch.mockImplementation(() => result({ q: { [key]: { v: new Point(1) } } }));

	const point = await query('hash/getPoint')(undefined);

	expect(point).toEqual(new Point(1));
	expect(point).toBeInstanceOf(Point);
	expect(env.fetch).toHaveBeenCalledWith('/_app/remote/hash/getPoint', undefined);
	expect(env.notify_version).toHaveBeenCalledOnce();
});

test('a query reports transport errors through the injected handle_error', async () => {
	env.fetch.mockImplementation(() => Promise.reject(new Error('offline')));

	const resource = query('hash/getOffline')(undefined);

	await expect(resource).rejects.toMatchObject({ body: { message: 'offline' } });
	expect(env.handle_error).toHaveBeenCalledWith(
		expect.objectContaining({ message: 'offline' }),
		expect.objectContaining({ route: { id: null } })
	);
});

test('a command sends the page URL from the env and resolves through the injected fetch', async () => {
	env.fetch.mockImplementation(() => result({ _: new Point(2) }));

	await expect(command('hash/movePoint')({ x: 1 })).resolves.toEqual(new Point(2));

	const [url, init] = env.fetch.mock.calls[0];
	expect(url).toBe('/_app/remote/hash/movePoint');
	expect(init.headers).toMatchObject({
		'x-sveltekit-pathname': '/posts',
		'x-sveltekit-search': '?page=2'
	});
});

test('a command prefers the URL of the navigation in progress', async () => {
	env.fetch.mockImplementation(() => result({ _: null }));
	set_remote_env({ navigating: { to: { url: new URL('http://localhost/next?a=b') } } });

	await command('hash/noop')(undefined);

	expect(env.fetch.mock.calls[0][1].headers).toMatchObject({
		'x-sveltekit-pathname': '/next',
		'x-sveltekit-search': '?a=b'
	});
});

/** @param {Omit<ReturnType<typeof form>, 'for'>} instance */
function attach(instance) {
	const element = document.createElement('form');
	const attachment = /** @type {symbol} */ (
		Reflect.ownKeys(instance).find((key) => typeof key === 'symbol')
	);
	const detach = /** @type {any} */ (instance)[attachment](element);
	return { element, detach };
}

test('a form submission resolves through the injected fetch and refresh_all', async () => {
	env.fetch.mockImplementation(() => result({ _: { result: { id: 1 } } }));

	const remote = form('hash/createPost');
	const { element, detach } = attach(remote);
	const input = document.createElement('input');
	input.name = remote.fields.title.as('text').name;
	input.value = 'Hello';
	element.append(input);

	try {
		await expect(remote.submit()).resolves.toBe(true);
		expect(remote.result).toEqual({ id: 1 });
		expect(env.fetch).toHaveBeenCalledWith(
			'/_app/remote/hash/createPost',
			expect.objectContaining({ method: 'POST' })
		);
		expect(env.refresh_all).toHaveBeenCalledOnce();
		expect(env.goto).not.toHaveBeenCalled();
	} finally {
		detach();
	}
});

test('a form redirect navigates with the injected goto', async () => {
	env.fetch.mockImplementation(() => result({ redirect: '/posts/1' }));

	const remote = form('hash/createPost');
	const { detach } = attach(remote);

	try {
		await expect(remote.submit()).resolves.toBe(true);
		expect(env.goto).toHaveBeenCalledWith('/posts/1', { refreshAll: true });
		expect(env.refresh_all).not.toHaveBeenCalled();
	} finally {
		detach();
	}
});

test('a live query streams values through the injected fetch', async () => {
	const encoder = new TextEncoder();
	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();

	/** @param {any} value */
	const send = (value) => {
		const event = { type: 'result', result: devalue.stringify(value, encoders) };
		void writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
	};

	env.fetch.mockImplementation(() =>
		Promise.resolve(new Response(readable, { headers: { 'content-type': 'text/event-stream' } }))
	);

	const live = query_live('hash/watchPoint')(undefined);
	send(new Point(1));

	await expect(live).resolves.toEqual(new Point(1));
	expect(env.fetch).toHaveBeenCalledWith(
		'/_app/remote/hash/watchPoint',
		expect.objectContaining({ headers: { accept: 'text/event-stream' } })
	);

	send(new Point(2));
	await vi.waitFor(() => expect(live.current).toEqual(new Point(2)));
	expect(live.current).toBeInstanceOf(Point);

	void writer.close();
	await vi.waitFor(() => expect(live.done).toBe(true));
});

test('reset_remote_state drops cached query values', async () => {
	const key = create_remote_key('hash/getResetPoint', '');
	env.fetch
		.mockImplementationOnce(() => result({ q: { [key]: { v: new Point(1) } } }))
		.mockImplementationOnce(() => result({ q: { [key]: { v: new Point(2) } } }));

	const get_point = query('hash/getResetPoint');
	// holding the first proxy keeps its cache entry alive
	const first = get_point(undefined);
	await expect(first).resolves.toEqual(new Point(1));
	await expect(get_point(undefined)).resolves.toEqual(new Point(1));
	expect(env.fetch).toHaveBeenCalledOnce();

	await reset_remote_state();

	await expect(get_point(undefined)).resolves.toEqual(new Point(2));
	expect(env.fetch).toHaveBeenCalledTimes(2);
	// a proxy looks its entry up by key, so the old one reads the new value too
	expect(first.current).toEqual(new Point(2));
});

test('reset_remote_state drops cached prerender values', async () => {
	env.fetch
		.mockImplementationOnce(() => result({ _: 1 }))
		.mockImplementationOnce(() => result({ _: 2 }));

	const get_count = prerender('hash/getResetCount');
	const first = get_count(undefined);
	await expect(first).resolves.toBe(1);
	await expect(get_count(undefined)).resolves.toBe(1);

	await reset_remote_state();

	await expect(get_count(undefined)).resolves.toBe(2);
	expect(first.current).toBe(1);
});

test('reset_remote_state clears form input and result', async () => {
	env.fetch.mockImplementation(() => result({ _: { result: { id: 1 } } }));

	const remote = form('hash/resetPost');
	const { detach } = attach(remote);

	try {
		remote.fields.title.set('Hello');
		await expect(remote.submit()).resolves.toBe(true);
		expect(remote.fields.title.value()).toBe('Hello');
		expect(remote.result).toEqual({ id: 1 });

		await reset_remote_state();

		expect(remote.fields.title.value()).toBeUndefined();
		expect(remote.result).toBeUndefined();
	} finally {
		detach();
	}
});

test('reset_remote_state closes live query connections', async () => {
	env.fetch.mockImplementation(() =>
		Promise.resolve(
			new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } })
		)
	);

	const live = query_live('hash/watchReset')(undefined);
	void live.current;
	await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());
	const { signal } = env.fetch.mock.calls[0][1];

	await reset_remote_state();

	expect(signal.aborted).toBe(true);
});

test('a live query awaited before its first value rejects on reset_remote_state', async () => {
	env.fetch.mockImplementation(() =>
		Promise.resolve(
			new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } })
		)
	);

	const live = query_live('hash/watchPending')(undefined);
	const first = Promise.resolve(live);
	await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());

	await reset_remote_state();

	await expect(first).rejects.toThrow('destroyed before it received a value');
});

/**
 * Starts a submission through `submit()` or through a submit event on the attached element
 * @param {ReturnType<typeof form>} remote
 * @param {HTMLFormElement} element
 * @param {'method' | 'event'} via
 */
function start_submission(remote, element, via) {
	if (via === 'method') return remote.submit();

	element.method = 'post';
	element.action = remote.action;
	element.requestSubmit();
}

test.each(/** @type {const} */ (['method', 'event']))(
	'reset_remote_state zeroes the pending count of a form submission that never settles (%s)',
	async (via) => {
		env.fetch.mockImplementation(() => new Promise(() => {}));

		const remote = form(`hash/neverPost_${via}`);
		const { element, detach } = attach(remote);

		try {
			void start_submission(remote, element, via);
			await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());
			expect(remote.pending).toBe(1);

			await reset_remote_state();

			expect(remote.pending).toBe(0);
		} finally {
			detach();
		}
	}
);

test.each(/** @type {const} */ (['method', 'event']))(
	'a form submission that settles after reset_remote_state leaves the pending count at 0 (%s)',
	async (via) => {
		const response = Promise.withResolvers();
		env.fetch.mockImplementation(() => response.promise);

		const remote = form(`hash/slowPost_${via}`);
		const { element, detach } = attach(remote);

		try {
			void start_submission(remote, element, via);
			await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());

			await reset_remote_state();
			response.resolve(result({ _: { result: { id: 1 } } }));

			// the response arrived and the submission settled
			await vi.waitFor(() => expect(env.notify_version).toHaveBeenCalledOnce());
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(remote.pending).toBe(0);
			expect(env.refresh_all).not.toHaveBeenCalled();
		} finally {
			detach();
		}
	}
);

test('reset_remote_state zeroes the pending count of commands, and late results leave it at 0', async () => {
	const slow = Promise.withResolvers();
	env.fetch
		.mockImplementationOnce(() => new Promise(() => {}))
		.mockImplementationOnce(() => slow.promise);

	const mutate = command('hash/resetMutate');
	void mutate(undefined);
	const late = mutate(undefined);
	await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledTimes(2));
	expect(mutate.pending).toBe(2);

	await reset_remote_state();
	expect(mutate.pending).toBe(0);

	slow.resolve(result({ _: 1 }));
	await expect(late).resolves.toBe(1);
	expect(mutate.pending).toBe(0);
});

test('a query response that arrives after reset_remote_state does not touch the next test', async () => {
	const key = create_remote_key('hash/getLatePoint', '');
	const slow = Promise.withResolvers();
	env.fetch
		.mockImplementationOnce(() => slow.promise)
		.mockImplementationOnce(() => result({ q: { [key]: { v: new Point(2) } } }));

	const get_point = query('hash/getLatePoint');
	void get_point(undefined).current;
	await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());

	await reset_remote_state();

	const next = get_point(undefined);
	await expect(next).resolves.toEqual(new Point(2));

	slow.resolve(result({ q: { [key]: { v: new Point(1) } } }));
	await vi.waitFor(() => expect(env.notify_version).toHaveBeenCalledTimes(2));

	expect(next.current).toEqual(new Point(2));
	expect(query_responses).toEqual({});
});

test.each([
	['a result', { _: { result: { id: 1 } } }],
	['a redirect', { redirect: '/old' }]
])(
	'a form submission that settles with %s after reset_remote_state does not touch the next test',
	async (_, old_data) => {
		const slow = Promise.withResolvers();
		env.fetch
			.mockImplementationOnce(() => slow.promise)
			.mockImplementationOnce(() => result({ _: { result: { id: 2 } } }));

		const remote = form('hash/latePost');
		const { detach } = attach(remote);

		try {
			const old_submission = remote.submit();
			await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());

			await reset_remote_state();

			await expect(remote.submit()).resolves.toBe(true);
			expect(remote.result).toEqual({ id: 2 });
			expect(env.refresh_all).toHaveBeenCalledOnce();

			slow.resolve(result(old_data));
			await old_submission;

			expect(remote.result).toEqual({ id: 2 });
			expect(env.refresh_all).toHaveBeenCalledOnce();
			expect(env.goto).not.toHaveBeenCalled();
		} finally {
			detach();
		}
	}
);

test('a prerender response that arrives after reset_remote_state does not fill the cache', async () => {
	const slow = Promise.withResolvers();
	env.fetch
		.mockImplementationOnce(() => slow.promise)
		.mockImplementationOnce(() => result({ _: 'new' }));

	const get_value = prerender('hash/getLateValue');
	const old = get_value(undefined);
	await vi.waitFor(() => expect(env.fetch).toHaveBeenCalledOnce());

	await reset_remote_state();

	slow.resolve(result({ _: 'old' }));
	await expect(old).resolves.toBe('old');

	await expect(get_value(undefined)).resolves.toBe('new');
	expect(env.fetch).toHaveBeenCalledTimes(2);
});

test('reset_remote_state waits for prerender cache writes that are still in flight', async () => {
	env.fetch
		.mockImplementationOnce(() => result({ _: 'A' }))
		.mockImplementationOnce(() => result({ _: 'B' }));

	const get_value = prerender('hash/getRacedValue');
	// resolving starts the cache write, which lands on the next macrotask
	await expect(get_value(undefined)).resolves.toBe('A');

	await reset_remote_state();

	// the next test starts a little later, after any write from before the reset has landed
	await new Promise((resolve) => setTimeout(resolve, 10));

	await expect(get_value(undefined)).resolves.toBe('B');
	expect(env.fetch).toHaveBeenCalledTimes(2);
});
