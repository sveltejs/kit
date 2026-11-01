/** @import { RequestEvent as Interface } from '@sveltejs/kit' */
import { afterEach, assert, expect, test, vi } from 'vitest';
import { RequestEvent, CONTEXT, QUERY, COMMAND, RENDER } from './event.js';

afterEach(() => {
	vi.doUnmock('node:async_hooks');
	vi.resetModules();
});

/** Waits for `event.js` to find out whether `AsyncLocalStorage` is available */
function settle() {
	return new Promise((resolve) => setTimeout(resolve));
}

function root() {
	return new RequestEvent(
		/** @type {Interface} */ (
			/** @type {unknown} */ ({
				url: new URL('http://localhost/page'),
				params: { id: '1' },
				route: { id: '/page' },
				cookies: { set: () => {}, delete: () => {} },
				setHeaders: () => {},
				tracing: { enabled: false }
			})
		),
		0
	);
}

test('explains where the request event can be read', async () => {
	const { getRequestEvent } = await import('./event.js');
	await settle();

	expect(() => getRequestEvent()).toThrowKitError('request_event_unavailable');
});

test('explains that the request event must be read synchronously without AsyncLocalStorage', async () => {
	vi.doMock('node:async_hooks', () => {
		throw new Error('not available');
	});
	const { getRequestEvent, get_request_store, with_request_store, RequestEvent } =
		await import('./event.js');
	await settle();

	expect(() => getRequestEvent()).toThrowKitError('request_event_after_await');
	expect(() => get_request_store()).toThrowKitError('request_store_after_await');

	const store = /** @type {any} */ ({
		event: new RequestEvent(/** @type {any} */ ({}), 0),
		state: {}
	});
	expect(with_request_store(store, () => getRequestEvent())).toBe(store.event);
});

test('flags accumulate through nested views', () => {
	const event = root().clone(RENDER).clone(QUERY);

	assert.isTrue(event.in_render);
	assert.isTrue(event.in_query);
	assert.isTrue(event.in_remote);
	assert.isFalse(event.in_prerender);
	assert.isFalse(event.in_mutation);
	assert.isFalse(root().in_render);
});

test('a query view throws on access to the page, on every copy', () => {
	const query = root().clone(QUERY);
	const traced = query.clone();

	for (const event of [query, traced, traced.clone(QUERY)]) {
		for (const property of /** @type {const} */ (['url', 'params', 'route'])) {
			expect(() => event[property]).toThrowKitError('remote_request_property', {
				contains: [`\`event.${property}\``]
			});
		}
	}

	assert.equal(root().clone(COMMAND).url.pathname, '/page');
});

test('a spread of a view is not an event any more', () => {
	const copy = { ...root().clone(QUERY) };

	assert.isUndefined(copy.url);
	assert.isFalse(copy instanceof RequestEvent);
	assert.isUndefined(/** @type {any} */ (copy).in_query);
	expect(() => /** @type {any} */ (copy).clone(QUERY)).toThrow(TypeError);
});

test('an event built by hand for `resolve` is adopted as a traced root', () => {
	const span = /** @type {any} */ ({});
	const adopted = RequestEvent.from({ ...root() }, span);

	assert.isTrue(adopted instanceof RequestEvent);
	assert.isFalse(adopted.in_render);
	assert.strictEqual(adopted.tracing.current, span);
});

test('views share the request data and own nothing else', () => {
	const base = root();
	const event = base.clone(QUERY);

	assert.strictEqual(event.locals, base.locals);
	assert.deepEqual(Object.getOwnPropertySymbols(event), [CONTEXT]);
	assert.isFalse(Object.hasOwn(event, 'url'));
});

test('remote views restrict headers and cookies', () => {
	const query = root().clone(QUERY);
	const command = root().clone(COMMAND);

	expect(() => query.setHeaders({})).toThrowKitError('remote_headers_forbidden');
	expect(() => query.cookies.set('a', 'b', { path: '/' })).toThrowKitError(
		'remote_cookie_forbidden',
		{ contains: ['set'] }
	);
	expect(() => command.cookies.set('a', 'b', { path: 'x' })).toThrowKitError(
		'remote_cookie_path_relative'
	);
	command.cookies.set('a', 'b', { path: '/' });
	expect(() => command.clone(QUERY).cookies.set('a', 'b', { path: '/' })).toThrowKitError(
		'remote_cookie_forbidden',
		{ contains: ['set'] }
	);
});
