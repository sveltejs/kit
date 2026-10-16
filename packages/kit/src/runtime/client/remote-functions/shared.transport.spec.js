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
	handle_error: (/** @type {any} */ error) => error.body,
	set_nearest_error_page: () => {},
	refreshAll: () => {}
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
const { form } = await import('./form.svelte.js');
const { query_batch } = await import('./query-batch.svelte.js');
const { create_remote_key, stringify_remote_arg } = await import('../../shared.js');

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

		expect(resource.set).toHaveBeenCalledWith(42, { sent: expect.any(Number), mutation: true });
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

	const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

	/**
	 * The server's response to a direct call of `hash/get_value`: the value is in `_`
	 * and, under the query's own key, in `q`
	 * @param {number} value
	 */
	const query_result = (value) => ({ _: value, q: { 'hash/get_value/': { v: value } } });

	/**
	 * The server's response to a command that updated `hash/get_value`
	 * @param {any} node
	 */
	const command_result = (node) => ({ _: null, q: { 'hash/get_value/': node } });

	/**
	 * Stubs `fetch` so that each request stays pending until the test responds to it
	 * @returns {Record<string, Array<(data: any) => void>>} the responders, by remote function id
	 */
	function hold_requests() {
		/** @type {Record<string, Array<(data: any) => void>>} */
		const respond = {};

		vi.stubGlobal('fetch', (/** @type {string} */ url) => {
			const id = url.split('/remote/')[1];

			return new Promise((fulfil) => {
				(respond[id] ??= []).push((data) =>
					fulfil(
						mock_response({
							json: () => Promise.resolve({ type: 'result', data: devalue.stringify(data) })
						})
					)
				);
			});
		});

		return respond;
	}

	test('an older response that arrives last does not overwrite a newer one', async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);

		void value.refresh();
		void value.refresh();
		expect(respond['hash/get_value']).toHaveLength(2);

		respond['hash/get_value'][1](query_result(2));
		await flush();
		expect(value.current).toBe(2);

		respond['hash/get_value'][0](query_result(1));
		await flush();
		expect(value.current).toBe(2);
	});

	test('stays loading until the newest of several refreshes responds', async () => {
		for (const failure of [false, true]) {
			const respond = hold_requests();
			const value = query('hash/get_value')(undefined);

			void value.refresh().catch(() => {});
			let refreshed = false;
			const refresh = value.refresh().then(() => (refreshed = true));

			respond['hash/get_value'][0](
				failure
					? { _: null, q: { 'hash/get_value/': { e: { status: 500, message: 'failed' } } } }
					: query_result(1)
			);
			await flush();
			expect(value.loading).toBe(true);
			expect(refreshed).toBe(false);

			respond['hash/get_value'][1](query_result(2));
			await refresh;
			expect(value.current).toBe(2);
			expect(value.loading).toBe(false);

			query_map.clear();
		}
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
		await expect(value.refresh()).rejects.toMatchObject({
			body: { status: 500, message: 'refresh failed' }
		});
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
		await flush();
		expect(_goto).toHaveBeenCalledWith('/next');
		expect(value.current).toBe(2);
	});

	test("a value read by another query doesn't replace the query's own newer read", async () => {
		const respond = hold_requests();
		const other = query('hash/other')(undefined);
		const value = query('hash/get_value')(undefined);

		void other.refresh();
		void value.refresh();
		respond['hash/get_value'][0](query_result(2));
		await flush();

		respond['hash/other'][0]({ _: 0, q: { 'hash/other/': { v: 0 }, 'hash/get_value/': { v: 1 } } });
		await flush();
		expect(value.current).toBe(2);
		expect(respond['hash/get_value']).toHaveLength(1);
	});

	test('a response that was in flight during a command does not overwrite its update', async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);

		void value.refresh();
		const mutation = command('hash/mutate')(undefined);
		await flush();
		respond['hash/mutate'][0](command_result({ v: 2 }));
		await mutation;
		expect(value.current).toBe(2);

		respond['hash/get_value'][0](query_result(1));
		await flush();
		expect(value.current).toBe(2);
		expect(respond['hash/get_value']).toHaveLength(1);
	});

	test("a refresh sent during a command isn't settled by the command's update", async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);

		const mutation = command('hash/mutate')(undefined);
		await flush();
		let refreshed = false;
		const refresh = value.refresh().then(() => (refreshed = true));
		respond['hash/mutate'][0](command_result({ v: 2 }));
		await mutation;
		await flush();
		expect(value.current).toBe(2);
		expect(value.loading).toBe(true);
		expect(refreshed).toBe(false);

		// the refresh may have read before the command committed, so a fresh read decides
		respond['hash/get_value'][0](query_result(3));
		await flush();
		expect(refreshed).toBe(false);
		expect(respond['hash/get_value']).toHaveLength(2);

		respond['hash/get_value'][1](query_result(3));
		await refresh;
		expect(value.current).toBe(3);
		expect(value.loading).toBe(false);
	});

	test("a command's failed update doesn't settle a refresh sent during the command", async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);

		const mutation = command('hash/mutate')(undefined);
		await flush();
		let refreshed = false;
		const refresh = value.refresh().then(() => (refreshed = true));
		respond['hash/mutate'][0](command_result({ e: { status: 500, message: 'failed' } }));
		await mutation;
		await flush();
		expect(refreshed).toBe(false);

		respond['hash/get_value'][0](query_result(3));
		respond['hash/get_value'][1](query_result(3));
		await refresh;
		expect(value.current).toBe(3);
		expect(value.error).toBe(undefined);
	});

	test("a command's update is applied after a read sent during the command, and a fresh read decides", async () => {
		for (const [read, committed] of [
			[0, 1], // the read ran before the command committed
			[3, 2] // the command's update was read before someone else's change
		]) {
			const respond = hold_requests();
			const value = query('hash/get_value')(undefined);

			const mutation = command('hash/mutate')(undefined);
			await flush();
			const refresh = value.refresh();
			respond['hash/get_value'][0](query_result(read));
			await refresh;
			expect(value.current).toBe(read);

			respond['hash/mutate'][0](command_result({ v: committed }));
			await mutation;
			expect(value.current).toBe(committed);
			expect(respond['hash/get_value']).toHaveLength(2);

			const fresh = Math.max(read, committed);
			respond['hash/get_value'][1](query_result(fresh));
			await flush();
			expect(value.current).toBe(fresh);

			query_map.clear();
		}
	});

	test('a failed fresh read fails the refresh that waited for it, and the query', async () => {
		const failed = { _: null, q: { 'hash/get_value/': { e: { status: 500, message: 'failed' } } } };

		for (const settled_first of [false, true]) {
			const respond = hold_requests();
			const value = query('hash/get_value')(undefined);

			const mutation = command('hash/mutate')(undefined);
			await flush();
			const refresh = value.refresh();
			refresh.catch(() => {});
			if (settled_first) {
				respond['hash/get_value'][0](query_result(0));
				await refresh;
			}

			respond['hash/mutate'][0](command_result({ v: 1 }));
			await mutation;
			respond['hash/get_value'][1](failed);

			if (!settled_first) {
				await expect(refresh).rejects.toMatchObject({ body: { status: 500, message: 'failed' } });
			}
			await expect(Promise.resolve(value)).rejects.toMatchObject({
				body: { status: 500, message: 'failed' }
			});
			expect(value.error).toEqual({ status: 500, message: 'failed' });

			query_map.clear();
		}
	});

	test('awaiting the query follows the newest fresh read after overlapping commands', async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);

		const first = command('hash/mutate')(undefined);
		await flush();
		const refresh = value.refresh();
		const second = command('hash/mutate')(undefined);
		await flush();

		respond['hash/mutate'][0](command_result({ v: 1 }));
		await first;
		respond['hash/mutate'][1](command_result({ v: 2 }));
		await second;
		// the refresh is superseded by the second command's update
		await refresh;
		expect(respond['hash/get_value']).toHaveLength(3);

		let settled = false;
		const awaited = Promise.resolve(value);
		awaited.then(
			() => (settled = true),
			() => (settled = true)
		);
		await flush();
		expect(settled).toBe(false);

		respond['hash/get_value'][2]({
			_: null,
			q: { 'hash/get_value/': { e: { status: 500, message: 'failed' } } }
		});
		await expect(awaited).rejects.toMatchObject({ body: { status: 500, message: 'failed' } });
		expect(value.error).toEqual({ status: 500, message: 'failed' });
	});

	test('a refresh that fails while a fresh read decides fails the callers waiting for that read', async () => {
		const failed = { status: 500, message: 'failed' };

		for (const batch of [false, true]) {
			const respond = hold_requests();
			const id = batch ? 'hash/get_batch' : 'hash/get_value';
			const key = batch ? create_remote_key(id, stringify_remote_arg('x')) : 'hash/get_value/';
			const value = batch ? query_batch(id)('x') : query(id)(undefined);
			/** @param {any} node */
			const answer = (node) =>
				batch
					? { _: [node.e ? { type: 'error', error: node.e } : { type: 'result', data: node.v }] }
					: { _: node.v ?? null, q: { [key]: node } };

			const mutation = command('hash/mutate')(undefined);
			await flush();
			const refresh = value.refresh();
			await flush();
			respond[id][0](answer({ v: 0 }));
			await refresh;

			respond['hash/mutate'][0]({ _: null, q: { [key]: { v: 1 } } });
			await mutation;
			await flush();
			expect(respond[id]).toHaveLength(2);

			let settled = false;
			const awaited = Promise.resolve(value);
			awaited.then(
				() => (settled = true),
				() => (settled = true)
			);
			const newer = value.refresh();
			newer.catch(() => {});
			await flush();
			expect(settled).toBe(false);

			respond[id][2](answer({ e: failed }));
			await expect(newer).rejects.toMatchObject({ body: failed });
			await expect(awaited).rejects.toMatchObject({ body: failed });
			expect(value.error).toEqual(failed);

			query_map.clear();
		}
	});

	test("a form's update that overlaps a refresh is decided by a fresh read, whose failure fails the refresh", async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);
		const remote = form('hash/myForm');
		const element = document.createElement('form');
		const attachment = /** @type {symbol} */ (
			Reflect.ownKeys(remote).find((key) => typeof key === 'symbol')
		);
		const detach = /** @type {any} */ (remote)[attachment](element);

		try {
			const submission = remote.submit();
			await flush();
			const refresh = value.refresh();
			refresh.catch(() => {});

			respond['hash/myForm'][0]({ _: {}, r: true, q: { 'hash/get_value/': { v: 1 } } });
			await expect(submission).resolves.toBe(true);
			expect(value.current).toBe(1);
			expect(respond['hash/get_value']).toHaveLength(2);

			respond['hash/get_value'][1]({
				_: null,
				q: { 'hash/get_value/': { e: { status: 500, message: 'failed' } } }
			});
			await expect(refresh).rejects.toMatchObject({ body: { status: 500, message: 'failed' } });
			expect(value.error).toEqual({ status: 500, message: 'failed' });
		} finally {
			detach();
		}
	});

	test("overlapping commands' updates are applied, and a fresh read decides", async () => {
		const respond = hold_requests();
		const value = query('hash/get_value')(undefined);

		const first = command('hash/mutate')(undefined);
		await flush();
		const second = command('hash/mutate')(undefined);
		await flush();

		respond['hash/mutate'][1](command_result({ v: 1 }));
		await second;
		expect(value.current).toBe(1);
		expect(respond['hash/get_value']).toBeUndefined();

		respond['hash/mutate'][0](command_result({ v: 2 }));
		await first;
		expect(value.current).toBe(2);
		expect(respond['hash/get_value']).toHaveLength(1);

		respond['hash/get_value'][0](query_result(2));
		await flush();
		expect(value.current).toBe(2);
	});
});
