import * as devalue from 'devalue';
import { beforeAll, expect, test, vi } from 'vitest';
import { init_remote_functions, with_request_store } from '@sveltejs/kit/internal/server';
import { create_request_state } from './state.js';

/** @type {typeof import('./remote-host.js')} */
let host;

beforeAll(async () => {
	// build-time constants that the server runtime reads at module scope
	vi.stubGlobal('__SVELTEKIT_DEV__', false);
	vi.stubGlobal('__SVELTEKIT_APP_VERSION__', 'test');
	host = await import('@sveltejs/kit/internal/remote-server');
});

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

/**
 * Builds the server module of a remote file the way SvelteKit's Vite plugin does
 * @param {Record<string, any>} exports
 */
function remote_module(exports) {
	init_remote_functions(exports, 'src/lib/points.remote.js', 'hash');
	return { hash: () => Promise.resolve({ default: exports }) };
}

/**
 * Sends a request through `handle_remote_request` inside a request store, as a host does
 * @param {Request} request
 */
function send(request) {
	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ (
		/** @type {unknown} */ ({
			request,
			url: new URL('http://localhost/'),
			tracing: { current: { setAttributes: vi.fn() } }
		})
	);
	const state = create_request_state(/** @type {any} */ ({}));

	return with_request_store({ event, state }, () => host.handle_remote_request(event));
}

/** @param {Response} response */
async function read(response) {
	const body = await response.json();
	const decoders = { Point: transport.Point.decode };
	return { ...body, data: body.data && devalue.parse(body.data, decoders) };
}

test('answers a query request with the given remote modules and transport', async () => {
	const get_point = host.query('unchecked', (/** @type {number} */ x) => new Point(x * 2));
	host.init_remote_server({ remotes: remote_module({ get_point }), transport });

	const payload = encodeURIComponent(btoa(devalue.stringify(2)));
	const response = await send(
		new Request(`http://localhost/_app/remote/hash/get_point?payload=${payload}`)
	);

	expect(response.status).toBe(200);
	const { type, data } = await read(response);
	expect(type).toBe('result');
	expect(Object.values(data.q)).toEqual([{ v: new Point(4) }]);
});

test('answers a command request', async () => {
	const add = host.command('unchecked', (/** @type {number} */ x) => x + 1);
	host.init_remote_server({ remotes: remote_module({ add }) });

	const response = await send(
		new Request('http://localhost/_app/remote/hash/add', {
			method: 'POST',
			body: JSON.stringify({ payload: btoa(devalue.stringify(1)), refreshes: [] })
		})
	);

	expect(await read(response)).toEqual({ type: 'result', data: { _: 2 } });
});

test('reports errors through the given handleError hook', async () => {
	const handleError = vi.fn(() => ({ message: 'handled' }));
	const fail = host.command('unchecked', () => {
		throw new Error('boom');
	});
	host.init_remote_server({ remotes: remote_module({ fail }), handleError });

	const response = await send(
		new Request('http://localhost/_app/remote/hash/fail', {
			method: 'POST',
			body: JSON.stringify({ payload: btoa(devalue.stringify(undefined)), refreshes: [] })
		})
	);

	// like SvelteKit's server, the error goes in the body, not in the status
	const { type, error } = await read(response);
	expect(type).toBe('error');
	expect(error).toEqual(expect.objectContaining({ message: 'handled' }));
	expect(handleError).toHaveBeenCalledWith(
		expect.objectContaining({ error: expect.objectContaining({ message: 'boom' }) })
	);
});

test('get_remote_id reads the remote function id from a request URL', () => {
	expect(host.get_remote_id(new URL('http://localhost/_app/remote/hash/add'))).toBe('hash/add');
	expect(host.get_remote_id(new URL('http://localhost/about'))).toBe(false);
});
