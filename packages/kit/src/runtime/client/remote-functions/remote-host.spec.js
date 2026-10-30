import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
	refresh_remote_queries,
	reset_remote_state,
	set_remote_env
} from '@sveltejs/kit/internal/client';
import { init_remote_functions, with_request_store } from '@sveltejs/kit/internal/server';
import { create_request_state } from '../../server/state.js';

// A tool such as a component test runner runs the client runtime and the server runtime of
// remote functions in one page, with `browser` conditions, and connects them with the env's
// `fetch`. This spec does the same, and imports SvelteKit only through its entries.

// Build-time constants that the runtime reads at module scope, and the generated root
// component that `client.js` imports, which only exist in a SvelteKit app
const globals = /** @type {any} */ (globalThis);
globals.__SVELTEKIT_PAYLOAD__ = undefined;
globals.__SVELTEKIT_EMBEDDED__ = false;
globals.__SVELTEKIT_CLIENT_ROUTING__ = true;
globals.__SVELTEKIT_DEV__ = false;
globals.__SVELTEKIT_HAS_SERVER_LOAD__ = false;
globals.__SVELTEKIT_HAS_UNIVERSAL_LOAD__ = false;
globals.__SVELTEKIT_FORK_PRELOADS__ = false;
globals.__SVELTEKIT_APP_VERSION__ = 'test';

vi.mock(new URL('../../components/root.svelte', import.meta.url).pathname, () => ({
	default: {}
}));

// The `browser` condition maps `#app/env/server` to a module that throws, so that server code
// cannot end up in a client bundle. A page that runs the server runtime has to map it back
vi.mock('#app/env/server', () => ({ building: false, prerendering: false }));

const client = await import('@sveltejs/kit/internal/remote-client');
const server = await import('@sveltejs/kit/internal/remote-server');

class Point {
	/** @param {number} x */
	constructor(x) {
		this.x = x;
	}
}

const transport = {
	Point: {
		encode: (/** @type {unknown} */ value) => value instanceof Point && value.x,
		decode: (/** @type {number} */ x) => new Point(x)
	}
};

let x = 1;
const get_point = vi.fn(() => new Point(x));
const move_point = vi.fn((/** @type {number} */ to) => {
	x = to;
	return new Point(x);
});

const save_point = vi.fn((/** @type {{ x: number }} */ data) => {
	x = data.x;
	return { saved: true };
});

const exports = {
	get_point: server.query(get_point),
	move_point: server.command('unchecked', move_point),
	save_point: server.form('unchecked', save_point)
};
init_remote_functions(exports, 'src/lib/points.remote.js', 'hash');

/**
 * Answers a request from the client runtime with the server runtime, in a request store
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function serve(url, init = {}) {
	// a form sends a jsdom `Blob`, which Node's `Request` cannot read
	const body = init.body instanceof Blob ? await init.body.arrayBuffer() : init.body;
	const request = new Request(new URL(url, 'http://localhost'), { ...init, body });
	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ (
		/** @type {unknown} */ ({
			request,
			url: new URL('http://localhost/'),
			tracing: { current: { setAttributes: () => {} } }
		})
	);
	const state = create_request_state(/** @type {any} */ ({}));

	return with_request_store({ event, state }, () => server.handle_remote_request(event));
}

beforeEach(() => {
	x = 1;
	get_point.mockClear();
	move_point.mockClear();

	server.init_remote_server({
		remotes: { hash: () => Promise.resolve({ default: exports }) },
		transport
	});

	set_remote_env({
		fetch: serve,
		decoders: { Point: transport.Point.decode },
		encoders: { Point: transport.Point.encode },
		page: { url: new URL('http://localhost/') },
		goto: () => Promise.resolve()
	});
});

afterEach(async () => {
	await reset_remote_state();
});

test('a query and a command go through the server runtime and back', async () => {
	const point = client.query('hash/get_point');
	await expect(point(undefined)).resolves.toEqual(new Point(1));

	await expect(client.command('hash/move_point')(3)).resolves.toEqual(new Point(3));
	expect(move_point).toHaveBeenCalledWith(3);
});

test('refresh_remote_queries runs the queries on the page again', async () => {
	const point = client.query('hash/get_point')(undefined);
	await expect(point).resolves.toEqual(new Point(1));
	expect(get_point).toHaveBeenCalledOnce();

	x = 5;
	await refresh_remote_queries();

	expect(get_point).toHaveBeenCalledTimes(2);
	expect(point.current).toEqual(new Point(5));
});

test('without a refresh_all in the env, a form submission refreshes the queries on the page', async () => {
	const point = client.query('hash/get_point')(undefined);
	await expect(point).resolves.toEqual(new Point(1));

	const remote = client.form('hash/save_point');
	const element = document.createElement('form');
	const input = document.createElement('input');
	input.name = remote.fields.x.as('number').name;
	input.value = '7';
	element.append(input);
	const attachment = /** @type {symbol} */ (
		Reflect.ownKeys(remote).find((key) => typeof key === 'symbol')
	);
	const detach = /** @type {any} */ (remote)[attachment](element);

	try {
		await expect(remote.submit()).resolves.toBe(true);
		// the form data object has no prototype, so compare a copy
		expect({ ...save_point.mock.calls[0][0] }).toEqual({ x: 7 });
		expect(remote.result).toEqual({ saved: true });
		expect(point.current).toEqual(new Point(7));
	} finally {
		detach();
	}
});

test('without a handle_error in the env, unexpected errors become a 500 and are logged', async () => {
	const error = vi.spyOn(console, 'error').mockImplementation(() => {});
	set_remote_env({ fetch: () => Promise.reject(new Error('offline')) });

	try {
		await expect(client.query('hash/get_point')(undefined)).rejects.toMatchObject({
			body: { status: 500, message: 'Internal Error' }
		});
		expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }));
	} finally {
		error.mockRestore();
	}
});

test('the server runtime decodes arguments with the transport', async () => {
	const echo = vi.fn((/** @type {Point} */ point) => point);
	const echo_exports = { echo: server.command('unchecked', echo) };
	init_remote_functions(echo_exports, 'src/lib/echo.remote.js', 'echo');
	server.init_remote_server({
		remotes: { echo: () => Promise.resolve({ default: echo_exports }) },
		transport
	});

	await expect(client.command('echo/echo')(new Point(9))).resolves.toEqual(new Point(9));
	expect(echo.mock.calls[0][0]).toBeInstanceOf(Point);
});
