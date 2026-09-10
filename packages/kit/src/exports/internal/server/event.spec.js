/** @import { RequestEvent as Interface } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { assert, expect, test } from 'vitest';
import { RequestEvent, CONTEXT, QUERY, COMMAND, RENDER } from './event.js';

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

test('flags accumulate through nested views', () => {
	const event = root().clone(RENDER).clone(QUERY);

	assert.isTrue(event.in_render);
	assert.isTrue(event.in_query);
	assert.isTrue(event.in_remote);
	assert.isTrue(event.read_only);
	assert.isFalse(event.in_mutation);
	assert.isFalse(root().in_render);
});

test('a query view throws on access to the page, on every copy', () => {
	const query = root().clone(QUERY);
	const traced = query.clone(0);

	for (const event of [query, traced, traced.clone(QUERY)]) {
		for (const property of /** @type {const} */ (['url', 'params', 'route'])) {
			expect(() => event[property]).toThrow(`Cannot access event.${property} in a query`);
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

test('an event built by hand is adopted with its flags', () => {
	const own = root().clone(RENDER);
	const adopted = RequestEvent.from({ ...own });

	assert.isTrue(adopted instanceof RequestEvent);
	assert.isTrue(adopted.in_render);
	assert.strictEqual(RequestEvent.from(own), own);
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

	expect(() => query.setHeaders({})).toThrow('setHeaders is not allowed');
	expect(() => query.cookies.set('a', 'b', { path: '/' })).toThrow('Cannot set cookies');
	expect(() => command.cookies.set('a', 'b', { path: 'x' })).toThrow('absolute path');
	command.cookies.set('a', 'b', { path: '/' });
});

test('the root event owns setHeaders, which writes to the request state until it responded', () => {
	const state = /** @type {RequestState} */ (
		/** @type {unknown} */ ({ headers: {}, responded: false })
	);
	const event = RequestEvent.create(/** @type {any} */ ({ cookies: {} }), state);
	const { setHeaders } = event;

	setHeaders({ 'Cache-Control': 'max-age=60', 'Server-Timing': 'a;dur=1' });
	setHeaders({ 'server-timing': 'b;dur=2' });
	assert.deepEqual(state.headers, {
		'cache-control': 'max-age=60',
		'server-timing': 'a;dur=1, b;dur=2'
	});

	expect(() => setHeaders({ 'cache-control': 'no-store' })).toThrow('already set');
	expect(() => setHeaders({ 'set-cookie': 'a=b' })).toThrow('event.cookies.set');

	assert.strictEqual(event.clone(RENDER).setHeaders, setHeaders);

	state.responded = true;
	expect(() => setHeaders({ 'x-a': 'b' })).toThrow('after the response');
});
