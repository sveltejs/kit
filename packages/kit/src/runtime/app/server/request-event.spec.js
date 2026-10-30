import { expect, test, vi } from 'vitest';
import { error, invalid, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import {
	getRequestEvent,
	get_request_store,
	init_remote_functions,
	try_get_request_store
} from '@sveltejs/kit/internal/server';
import { withRequestEvent } from './request-event.js';
import { command } from './remote/command.js';
import { form } from './remote/form.js';

vi.mock('#app/env/server', () => ({ prerendering: false }));

vi.stubGlobal('__SVELTEKIT_DEV__', false);
const { query } = await import('./remote/query.js');
const { requested } = await import('./remote/requested.js');

test('runs a query with the given locals and cookies', async () => {
	const locals = { user: 'rich' };

	const get_user = query(() => {
		const event = getRequestEvent();
		return { locals: event.locals, session: event.cookies.get('session') };
	});

	const result = await withRequestEvent({ locals, cookies: { session: 'a b' } }, () => get_user());

	expect(result.locals).toBe(locals);
	expect(result.session).toBe('a b');
});

test('passes the synthetic event to the callback and to getRequestEvent', async () => {
	const get_request = query(() => getRequestEvent().request);

	await withRequestEvent(
		{ url: '/blog/hello', params: { slug: 'hello' }, route: { id: '/blog/[slug]' } },
		async (event) => {
			expect(getRequestEvent()).toBe(event);
			expect(event.url.href).toBe('http://localhost/blog/hello');
			expect(event.params).toEqual({ slug: 'hello' });
			expect(event.route).toEqual({ id: '/blog/[slug]' });
			expect(event.request.method).toBe('POST');
			expect(event.isRemoteRequest).toBe(true);
			expect(event.getClientAddress()).toBe('127.0.0.1');
			expect(await get_request()).toBe(event.request);
		}
	);

	expect(try_get_request_store()).toBe(null);
});

test('keeps the cookies of a given request and adds the initial cookies', () => {
	const request = new Request('http://localhost/page', { headers: { cookie: 'theme=dark' } });

	withRequestEvent({ request, cookies: { session: 'abc' } }, (event) => {
		expect(event.request.method).toBe('GET');
		expect(event.url.href).toBe('http://localhost/page');
		expect(event.cookies.getAll()).toEqual([
			{ name: 'theme', value: 'dark' },
			{ name: 'session', value: 'abc' }
		]);
	});
});

test('runs a form and returns the issues from invalid()', async () => {
	const create_post = form(
		'unchecked',
		/** @param {{ title: string }} data */
		(data, issue) => {
			if (data.title.length < 3) invalid(issue.title('Too short'));
			return { title: data.title };
		}
	);

	const internals = /** @type {any} */ (create_post).__;

	const failure = await withRequestEvent({}, () => internals.fn({ title: 'Hi' }, {}, null));
	expect(failure.issues).toEqual([
		{ name: 'title', path: ['title'], message: 'Too short', server: true }
	]);
	expect(failure.result).toBe(undefined);

	const success = await withRequestEvent({}, () => internals.fn({ title: 'Hello' }, {}, null));
	expect(success.issues).toBe(undefined);
	expect(success.result).toEqual({ title: 'Hello' });
});

test('runs a command, and the cookies it sets are readable afterwards', async () => {
	const login = command('unchecked', (/** @type {string} */ name) => {
		getRequestEvent().cookies.set('session', name, { path: '/' });
		return 'ok';
	});

	await withRequestEvent({}, async (event) => {
		expect(await login('rich')).toBe('ok');
		expect(event.cookies.get('session')).toBe('rich');
	});
});

test('commands and forms can call requested(), queries cannot', async () => {
	const get_posts = query(() => []);

	const refresh = command(async () => {
		await requested(get_posts, Infinity).refreshAll();
		return 'ok';
	});
	const submit = form(async () => {
		await requested(get_posts, Infinity).refreshAll();
		return 'ok';
	});
	const read = query(() => requested(get_posts, Infinity));

	expect(await withRequestEvent({}, () => refresh())).toBe('ok');

	const internals = /** @type {any} */ (submit).__;
	const output = await withRequestEvent({}, () => internals.fn({}, {}, null));
	expect(output.result).toBe('ok');

	await expect(withRequestEvent({}, () => read())).rejects.toThrowKitError(
		'remote_requested_context'
	);
});

test('runs the refreshes a command defers after the callback resolves', async () => {
	let runs = 0;
	const count = query(() => ++runs);

	const refresh = command(async () => {
		await count().refresh();
		return runs;
	});
	const refresh_requested = command(async () => {
		// as if the client had asked for `count()` to be refreshed
		get_request_store().state.remote.requested = new Map([['hash/count', new Set([''])]]);
		await requested(count, Infinity).refreshAll();
		return runs;
	});
	init_remote_functions({ count, refresh, refresh_requested }, 'src/lib/test.remote.js', 'hash');

	expect(await withRequestEvent({}, () => refresh())).toBe(0);
	expect(runs).toBe(1);

	expect(await withRequestEvent({}, () => refresh_requested())).toBe(1);
	expect(runs).toBe(2);
});

test('runs the deferred refresh of a query.batch inside the request', async () => {
	let runs = 0;
	const count = query.batch('unchecked', () => {
		runs += 1;
		return (/** @type {number} */ id) => id;
	});
	const refresh = command(async () => {
		await count(1).refresh();
	});
	init_remote_functions({ count, refresh }, 'src/lib/test.remote.js', 'hash');

	await withRequestEvent({}, () => refresh());
	expect(runs).toBe(1);
});

test('runs the deferred reconnect of a query.live inside the request', async () => {
	let runs = 0;
	const count = query.live(function* () {
		runs += 1;
		yield getRequestEvent().locals;
	});
	const reconnect = command(async () => {
		await count().reconnect();
	});
	init_remote_functions({ count, reconnect }, 'src/lib/test.remote.js', 'hash');

	await withRequestEvent({}, () => reconnect());
	expect(runs).toBe(1);
});

test('rejects with the error of a deferred refresh', async () => {
	const failure = new Error('refresh failed');
	const broken = query(() => {
		throw failure;
	});
	const refresh = command(async () => {
		await broken().refresh();
	});
	init_remote_functions({ broken, refresh }, 'src/lib/test.remote.js', 'hash');

	await expect(withRequestEvent({}, () => refresh())).rejects.toBe(failure);
});

test('reads the page URL from the headers of a remote call', () => {
	const request = new Request('http://localhost/_app/remote/hash/save', {
		method: 'POST',
		headers: { 'x-sveltekit-pathname': '/blog/hello', 'x-sveltekit-search': '?draft=1' }
	});

	withRequestEvent({ request }, (event) => {
		expect(event.url.href).toBe('http://localhost/blog/hello?draft=1');
	});

	withRequestEvent({ request, url: '/other' }, (event) => {
		expect(event.url.href).toBe('http://localhost/other');
	});
});

test('setHeaders follows the same rules as in a request', () => {
	withRequestEvent({}, (event) => {
		event.setHeaders({ 'server-timing': 'a;dur=1' });
		event.setHeaders({ 'server-timing': 'b;dur=2' });
		event.setHeaders({ 'x-test': '1' });

		expect(() => event.setHeaders({ 'x-test': '2' })).toThrowKitError('header_already_set');
		expect(() => event.setHeaders({ 'set-cookie': 'a=b' })).toThrowKitError('set_headers_cookie');
	});
});

test('rejects a command when the request is not a mutation', () => {
	const mutate = command(() => 'ok');

	expect(() =>
		withRequestEvent({ request: new Request('http://localhost/') }, () => mutate())
	).toThrowKitError('remote_command_method');
});

test('propagates error() and redirect()', async () => {
	const missing = query(() => error(404, 'Not found'));
	const moved = query(() => redirect(307, '/new'));
	const forbidden = command(() => error(403, 'Forbidden'));

	const not_found = await withRequestEvent({}, () => missing()).catch((e) => e);
	expect(isHttpError(not_found, 404)).toBe(true);
	expect(not_found.body).toEqual({ status: 404, message: 'Not found' });

	const redirected = await withRequestEvent({}, () => moved()).catch((e) => e);
	expect(isRedirect(redirected)).toBe(true);
	expect(redirected.location).toBe('/new');

	const rejected = await withRequestEvent({}, () => forbidden()).catch((e) => e);
	expect(isHttpError(rejected, 403)).toBe(true);
});

test('runs a live query until the signal is aborted', async () => {
	const controller = new AbortController();
	const cleanup = vi.fn();

	const count = query.live(async function* () {
		const locals = /** @type {{ prefix: string }} */ (getRequestEvent().locals);
		try {
			for (let i = 1; ; i += 1) {
				yield `${locals.prefix}${i}`;
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		} finally {
			cleanup();
		}
	});

	/** @type {string[]} */
	const values = [];

	await withRequestEvent({ locals: { prefix: '#' }, signal: controller.signal }, async (event) => {
		expect(event.request.signal.aborted).toBe(false);

		for await (const value of count()) {
			values.push(value);
			if (values.length === 3) controller.abort();
		}
	});

	expect(values).toEqual(['#1', '#2', '#3']);
	await vi.waitFor(() => expect(cleanup).toHaveBeenCalledOnce());
});
