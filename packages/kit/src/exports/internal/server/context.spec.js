/** @import { RequestEvent } from '@sveltejs/kit' */
import { assert, expect, test } from 'vitest';
import { CONTEXT, derive_event, inside } from './context.js';

/** @returns {RequestEvent} */
function root() {
	return /** @type {RequestEvent} */ (
		/** @type {unknown} */ ({
			url: new URL('http://localhost/page'),
			params: { id: '1' },
			route: { id: '/page' },
			cookies: { set: () => {}, delete: () => {} },
			setHeaders: () => {},
			tracing: { enabled: false },
			[CONTEXT]: 0
		})
	);
}

test('flags accumulate through nested views', () => {
	const event = derive_event(derive_event(root(), 'render'), 'query');

	assert.isTrue(inside(event, 'render'));
	assert.isTrue(inside(event, 'query'));
	assert.isTrue(inside(event, 'remote'));
	assert.isFalse(inside(event, 'mutation'));
	assert.isFalse(inside(root(), 'render'));
});

test('a query view throws on access to the page, on every copy', () => {
	const query = derive_event(root(), 'query');
	const traced = derive_event(query, null, { locals: {} });

	for (const event of [query, traced, derive_event(traced, 'query')]) {
		for (const property of /** @type {const} */ (['url', 'params', 'route'])) {
			expect(() => event[property]).toThrow(`Cannot access event.${property} in a query`);
		}
	}

	assert.equal(derive_event(root(), 'command').url.pathname, '/page');
});

test('a spread of a view loses its context loudly', () => {
	const copy = { ...derive_event(root(), 'query') };

	assert.isUndefined(copy.url);
	expect(() => inside(copy, 'query')).toThrow('copied without `derive_event`');
});

test('views own only request data', () => {
	const event = derive_event(root(), 'query');

	assert.deepEqual(Object.getOwnPropertySymbols(event), []);
	assert.isFalse(Object.hasOwn(event, 'url'));
	assert.isTrue(Object.hasOwn(event, 'cookies'));
});

test('remote views restrict headers and cookies', () => {
	const query = derive_event(root(), 'query');
	const command = derive_event(root(), 'command');

	expect(() => query.setHeaders({})).toThrow('setHeaders is not allowed');
	expect(() => query.cookies.set('a', 'b', { path: '/' })).toThrow('Cannot set cookies');
	expect(() => command.cookies.set('a', 'b', { path: 'x' })).toThrow('absolute path');
	command.cookies.set('a', 'b', { path: '/' });
});
