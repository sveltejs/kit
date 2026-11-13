import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest';

// Mock `client.js` — the real module pulls in the SvelteKit router/hydration
// machinery and resolves `$app/paths` to a server-side virtual module that only
// exists during a real SvelteKit build. We only need stubs for the names that
// `shared.svelte.js` imports.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	app: { decoders: {}, hooks: { transport: {} } },
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	_goto: () => {}
}));

// Mock `#app/state/client` — imports `navigating` and `page` which are reactive
// Svelte state only available in a full SvelteKit runtime.
vi.mock('#app/state/client', () => ({
	navigating: { current: null },
	page: { url: new URL('http://localhost/') },
	updated: { current: false, check: () => Promise.resolve(false) },
	notify_version: () => {}
}));

const { fail_unhandled_refreshes, remote_request, categorize_updates, QUERY_OVERRIDE_KEY } =
	await import('./shared.svelte.js');
const { HttpError, HandledHttpError } = await import('@sveltejs/kit/internal');
const { app, query_map, live_query_map } = await import('../client.js');
const devalue = await import('devalue');
const { command } = await import('./command.svelte.js');

test('command update warnings retain the original promise and deferred argument failures', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const fetch = vi.fn(() =>
		mock_response({
			json: () => Promise.resolve({ type: 'result', data: devalue.stringify({ _: 42 }) })
		})
	);
	vi.stubGlobal('fetch', fetch);
	try {
		const mutate = command('hash/mutate');
		const promise = mutate(undefined);
		expect(promise.updates()).toBe(promise);
		expect(promise.updates()).toBe(promise);
		await expect(promise).resolves.toBe(42);
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toContainKitDiagnostic('remote_updates_repeated', {
			contains: ['command invocation']
		});
		expect(mutate.pending).toBe(0);
		const invalid = mutate(undefined);
		expect(invalid.updates(/** @type {any} */ (null))).toBe(invalid);
		await expect(invalid).rejects.toThrowKitError('remote_updates_invalid_argument');
		expect(fetch).toHaveBeenCalledOnce();
		expect(mutate.pending).toBe(0);
	} finally {
		warn.mockRestore();
		vi.unstubAllGlobals();
	}
});

test('command redirects reject with client guidance', async () => {
	vi.stubGlobal('fetch', () =>
		mock_response({
			json: () =>
				Promise.resolve({ type: 'result', data: devalue.stringify({ redirect: '/next' }) })
		})
	);
	try {
		const mutate = command('hash/mutate');
		await expect(mutate(undefined)).rejects.toThrowKitError('remote_command_redirect');
		expect(mutate.pending).toBe(0);
	} finally {
		vi.unstubAllGlobals();
	}
});

test('invalid update arguments throw without changing their value', () => {
	for (const value of [null, undefined, 1, 'query', {}]) {
		expect(() => categorize_updates([/** @type {any} */ (value)])).toThrowKitError(
			'remote_updates_invalid_argument'
		);
	}
	const release = () => {};
	Object.defineProperty(release, QUERY_OVERRIDE_KEY, { value: 'hash/query/' });
	expect(() => categorize_updates([release, release])).toThrowKitError(
		'remote_updates_duplicate_override'
	);
});

/**
 * Build a mock fetch Response. `remote_request` reads `response.headers` before
 * anything else, so every mock needs a `headers` object.
 * @param {Partial<Response> & { json?: () => Promise<any> }} props
 */
function mock_response(props) {
	return Promise.resolve({
		headers: new Headers(),
		ok: true,
		status: 200,
		statusText: 'OK',
		json: () => Promise.resolve({}),
		...props
	});
}

describe('remote_request transport error handling', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		query_map.clear();
		live_query_map.clear();
	});

	test('non-OK response with JSON error body preserves status and error body', async () => {
		vi.stubGlobal('fetch', () =>
			mock_response({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: () =>
					Promise.resolve({
						type: 'error',
						status: 401,
						error: { status: 401, message: 'unauthorized' }
					})
			})
		);

		await expect(remote_request('/x')).rejects.toSatisfy((e) => {
			return (
				e instanceof HandledHttpError && e.status === 401 && e.body?.message === 'unauthorized'
			);
		});
	});

	test('non-OK response with non-JSON body falls back to response.status and statusText', async () => {
		vi.stubGlobal('fetch', () =>
			mock_response({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				json: () => Promise.reject(new SyntaxError('Unexpected token'))
			})
		);

		await expect(remote_request('/x')).rejects.toSatisfy((e) => {
			return e instanceof HttpError && !(e instanceof HandledHttpError) && e.status === 503;
		});
	});

	test('OK response with valid result payload does not throw an HttpError with status 500', async () => {
		// Build a minimal valid RemoteFunctionResponse with type 'result' and no data.
		const body = JSON.stringify({ type: 'result', data: null });

		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () => Promise.resolve(JSON.parse(body))
			})
		);

		// Should resolve without throwing.
		await expect(remote_request('/x')).resolves.toBeDefined();
	});

	test('fails requested updates missing from the response', async () => {
		const fail = vi.fn();
		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { fail } }]])));
		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () => Promise.resolve({ type: 'result', data: devalue.stringify({}) })
			})
		);

		await remote_request('/x', undefined, new Set(['hash/query/[-1]']));
		fail_unhandled_refreshes(new Set(['hash/query/[-1]']));

		expect(fail).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 400,
				body: expect.objectContaining({
					message: 'Requested update was not handled by the remote function'
				})
			})
		);
	});

	test('does not fail missing updates before the caller commits reconciliation', async () => {
		const fail = vi.fn();
		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { fail } }]])));
		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () =>
					Promise.resolve({
						type: 'result',
						data: devalue.stringify({ _: { issues: [{ message: 'invalid' }] } })
					})
			})
		);

		await remote_request('/x', undefined, new Set(['hash/query/[-1]']));

		expect(fail).not.toHaveBeenCalled();
	});

	test('does not fail requested updates returned in the response', async () => {
		const resource = { fail: vi.fn(), set: vi.fn() };
		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource }]])));
		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () =>
					Promise.resolve({
						type: 'result',
						data: devalue.stringify({ q: { 'hash/query/[-1]': { v: 42 } } })
					})
			})
		);

		const refreshes = new Set(['hash/query/[-1]']);
		await remote_request('/x', undefined, refreshes);
		fail_unhandled_refreshes(refreshes);

		expect(resource.set).toHaveBeenCalledWith(42);
		expect(resource.fail).not.toHaveBeenCalled();
	});

	test('does not fail explicitly ignored requested updates', async () => {
		const fail = vi.fn();
		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { fail } }]])));
		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () =>
					Promise.resolve({
						type: 'result',
						data: devalue.stringify({ i: ['hash/query/[-1]'] })
					})
			})
		);

		const refreshes = new Set(['hash/query/[-1]']);
		await remote_request('/x', undefined, refreshes);
		fail_unhandled_refreshes(refreshes);

		expect(fail).not.toHaveBeenCalled();
	});
});

describe('transport decode context', () => {
	class Point {
		/** @param {number} x */
		constructor(x) {
			this.x = x;
		}
	}

	/** @type {Array<{ x: number, call: { id: number } | undefined }>} */
	let decoded = [];

	/** @param {any} value */
	const encode = (value) => devalue.stringify(value, { Point: (v) => v instanceof Point && [v.x] });

	/** @param {any} value */
	const respond = (value) =>
		mock_response({
			json: () => Promise.resolve({ type: 'result', data: encode(value) })
		});

	beforeEach(() => {
		vi.unstubAllGlobals();
		query_map.clear();
		decoded = [];
		app.hooks.transport = {
			Point: {
				encode: (value) => value instanceof Point && [value.x],
				decode: ([x], { call }) => {
					decoded.push({ x, call });
					return new Point(x);
				}
			}
		};
	});

	afterEach(() => {
		app.hooks.transport = {};
	});

	test('decode sees a higher call id for each remote request', async () => {
		vi.stubGlobal('fetch', () => respond({ _: new Point(1) }));
		await remote_request('/x');

		vi.stubGlobal('fetch', () => respond({ _: new Point(2) }));
		await remote_request('/x');

		expect(decoded.map((d) => d.x)).toEqual([1, 2]);
		expect(decoded[0].call?.id).toBeTypeOf('number');
		expect(/** @type {number} */ (decoded[1].call?.id)).toBeGreaterThan(
			/** @type {number} */ (decoded[0].call?.id)
		);
	});

	test('decode orders values by when the request was sent, not when its response arrived', async () => {
		/** @type {Array<(value: any) => void>} */
		const responses = [];
		vi.stubGlobal('fetch', () => new Promise((fulfil) => responses.push(fulfil)));

		const first = remote_request('/x');
		const second = remote_request('/x');

		// the second request responds first
		responses[1](await respond({ _: new Point(2) }));
		await second;
		responses[0](await respond({ _: new Point(1) }));
		await first;

		expect(decoded.map((d) => d.x)).toEqual([2, 1]);
		expect(/** @type {number} */ (decoded[1].call?.id)).toBeLessThan(
			/** @type {number} */ (decoded[0].call?.id)
		);
	});

	test('single-flight updates in a response share the call of the request that carried them', async () => {
		const set = vi.fn();
		query_map.set('hash/query', /** @type {any} */ (new Map([['[-1]', { resource: { set } }]])));
		vi.stubGlobal('fetch', () =>
			respond({ _: new Point(1), q: { 'hash/query/[-1]': { v: new Point(2) } } })
		);

		await remote_request('/x', undefined, new Set(['hash/query/[-1]']));

		expect(set).toHaveBeenCalledWith(new Point(2));
		expect(decoded).toHaveLength(2);
		expect(decoded[0].call).toBeDefined();
		expect(decoded[1].call).toBe(decoded[0].call);
	});
});
