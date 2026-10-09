import { describe, expect, test, vi, beforeEach } from 'vitest';

// Mock `client.js` — the real module pulls in the SvelteKit router/hydration
// machinery and resolves `$app/paths` to a server-side virtual module that only
// exists during a real SvelteKit build. We only need stubs for the names that
// `shared.svelte.js` imports.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	app: { decoders: {} },
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	_goto: vi.fn(),
	handle_error: (/** @type {any} */ error) => error.body
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
const { query_map, live_query_map, _goto } = await import('../client.js');
const devalue = await import('devalue');
const { command } = await import('./command.svelte.js');
const { query } = await import('./query/index.js');

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

describe('query responses', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		query_map.clear();
	});

	/**
	 * Stubs `fetch` so that each request for `hash/get_value` stays pending until
	 * the test responds to it, mirroring the server's response shape for a direct
	 * query call (the value is in `_` and, under the query's own key, in `q`)
	 * @param {Record<string, any>} [other] responses for other remote functions
	 */
	function hold_query_requests(other = {}) {
		/** @type {Array<(value: number) => void>} */
		const respond = [];

		vi.stubGlobal('fetch', (/** @type {string} */ url) => {
			const id = url.split('/remote/')[1];
			if (id in other) {
				return mock_response({
					json: () => Promise.resolve({ type: 'result', data: devalue.stringify(other[id]) })
				});
			}

			return new Promise((fulfil) => {
				respond.push((value) =>
					fulfil(
						mock_response({
							json: () =>
								Promise.resolve({
									type: 'result',
									data: devalue.stringify({ _: value, q: { 'hash/get_value/': { v: value } } })
								})
						})
					)
				);
			});
		});

		return respond;
	}

	test('an older response that arrives last does not overwrite a newer one', async () => {
		const respond = hold_query_requests();
		const value = query('hash/get_value')(undefined);

		void value.refresh();
		void value.refresh();
		expect(respond).toHaveLength(2);

		respond[1](2);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(value.current).toBe(2);

		respond[0](1);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(value.current).toBe(2);
	});

	test('uses the value or error a query set on itself on the server', async () => {
		/** @type {any} */
		let node = { v: 2 };
		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () =>
					Promise.resolve({
						type: 'result',
						data: devalue.stringify({ _: 1, q: { 'hash/get_value/': node } })
					})
			})
		);
		const value = query('hash/get_value')(undefined);

		await value.refresh();
		expect(value.current).toBe(2);

		node = { e: { status: 500, message: 'refresh failed' } };
		await value.refresh().catch(() => {});
		expect(value.error).toEqual({ status: 500, message: 'refresh failed' });
	});

	test('applies a value the query set on itself before following its redirect', async () => {
		vi.mocked(_goto).mockReturnValueOnce(new Promise(() => {}));
		vi.stubGlobal('fetch', () =>
			mock_response({
				json: () =>
					Promise.resolve({
						type: 'result',
						data: devalue.stringify({ redirect: '/next', q: { 'hash/get_value/': { v: 2 } } })
					})
			})
		);
		const value = query('hash/get_value')(undefined);

		void value.refresh();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(_goto).toHaveBeenCalledWith('/next');
		expect(value.current).toBe(2);
	});

	test('a response that was in flight during a command does not overwrite its update', async () => {
		const respond = hold_query_requests({
			'hash/mutate': { _: null, q: { 'hash/get_value/': { v: 2 } } }
		});
		const value = query('hash/get_value')(undefined);

		void value.refresh();
		await command('hash/mutate')(undefined);
		expect(value.current).toBe(2);

		respond[0](1);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(value.current).toBe(2);
	});
});
