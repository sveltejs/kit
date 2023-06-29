import { assert, expect, test } from 'vitest';
import { sequence } from './sequence.js';
import { installPolyfills } from '../node/polyfills.js';

installPolyfills();

test('applies handlers in sequence', async () => {
	/** @type {string[]} */
	const order = [];

	const handler = sequence(
		async ({ event, resolve }) => {
			order.push('1a');
			const response = await resolve(event);
			order.push('1b');
			return response;
		},
		async ({ event, resolve }) => {
			order.push('2a');
			const response = await resolve(event);
			order.push('2b');
			return response;
		},
		async ({ event, resolve }) => {
			order.push('3a');
			const response = await resolve(event);
			order.push('3b');
			return response;
		}
	);

	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({});
	const response = new Response();

	assert.equal(await handler({ event, resolve: () => response }), response);
	expect(order).toEqual(['1a', '2a', '3a', '3b', '2b', '1b']);
});

test('uses transformPageChunk option passed to non-terminal handle function', async () => {
	const handler = sequence(
		async ({ event, resolve }) => {
			return resolve(event, {
				transformPageChunk: ({ html, done }) => html + (done ? '-1-done' : '-1')
			});
		},
		async ({ event, resolve }) => resolve(event),
		async ({ event, resolve }) => resolve(event)
	);

	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({});
	const response = await handler({
		event,
		resolve: async (_event, opts = {}) => {
			let html = '';

			const { transformPageChunk = ({ html }) => html } = opts;

			html += await transformPageChunk({ html: '0', done: false });
			html += await transformPageChunk({ html: ' 0', done: true });

			return new Response(html);
		}
	});

	assert.equal(await response.text(), '0-1 0-1-done');
});

test('merges transformPageChunk option', async () => {
	const handler = sequence(
		async ({ event, resolve }) => {
			return resolve(event, {
				transformPageChunk: ({ html, done }) => html + (done ? '-1-done' : '-1')
			});
		},
		async ({ event, resolve }) => {
			return resolve(event, {
				transformPageChunk: ({ html, done }) => html + (done ? '-2-done' : '-2')
			});
		},
		async ({ event, resolve }) => {
			return resolve(event, {
				transformPageChunk: ({ html, done }) => html + (done ? '-3-done' : '-3')
			});
		}
	);

	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({});
	const response = await handler({
		event,
		resolve: async (_event, opts = {}) => {
			let html = '';

			const { transformPageChunk = ({ html }) => html } = opts;

			html += await transformPageChunk({ html: '0', done: false });
			html += await transformPageChunk({ html: ' 0', done: true });

			return new Response(html);
		}
	});

	assert.equal(await response.text(), '0-3-2-1 0-3-done-2-done-1-done');
});

test('uses first defined preload option', async () => {
	const handler = sequence(
		async ({ event, resolve }) => resolve(event),
		async ({ event, resolve }) => {
			return resolve(event, {
				preload: ({ type }) => type === 'js'
			});
		},
		async ({ event, resolve }) => {
			return resolve(event, {
				preload: () => true
			});
		}
	);

	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({});
	const response = await handler({
		event,
		resolve: async (_event, opts = {}) => {
			let html = '';

			const { preload = () => false } = opts;

			html += preload({ path: '', type: 'js' });
			html += preload({ path: '', type: 'css' });

			return new Response(html);
		}
	});

	assert.equal(await response.text(), 'truefalse');
});

test('uses first defined filterSerializedResponseHeaders option', async () => {
	const handler = sequence(
		async ({ event, resolve }) => resolve(event),
		async ({ event, resolve }) => {
			return resolve(event, {
				filterSerializedResponseHeaders: (name) => name === 'a'
			});
		},
		async ({ event, resolve }) => {
			return resolve(event, {
				filterSerializedResponseHeaders: () => true
			});
		}
	);

	const event = /** @type {import('@sveltejs/kit').RequestEvent} */ ({});
	const response = await handler({
		event,
		resolve: async (_event, opts = {}) => {
			let html = '';

			const { filterSerializedResponseHeaders = () => false } = opts;

			html += filterSerializedResponseHeaders('a', '');
			html += filterSerializedResponseHeaders('b', '');

			return new Response(html);
		}
	});

	assert.equal(await response.text(), 'truefalse');
});
