import { assert, expect, test } from 'vitest';
import { create_universal_fetch } from './load_data.js';

/**
 * @param {Partial<Pick<import('@sveltejs/kit').RequestEvent, 'fetch' | 'url' | 'request' | 'route'>>} event
 */
function create_fetch(event) {
	event.fetch = event.fetch || (async () => new Response('foo'));
	event.request = event.request || new Request('doesnt:matter');
	event.route = event.route || { id: 'foo' };
	event.url = event.url || new URL('https://domain-a.com');
	return create_universal_fetch(
		/** @type {Pick<import('@sveltejs/kit').RequestEvent, 'fetch' | 'url' | 'request' | 'route'>} */ (
			event
		),
		{ getClientAddress: () => '', error: false, depth: 0 },
		[],
		true,
		{
			filterSerializedResponseHeaders: () => false
		}
	);
}

test('sets body to empty when mode is no-cors', async () => {
	const fetch = create_fetch({});
	const response = await fetch('https://domain-b.com', { mode: 'no-cors' });
	const text = await response.text();
	assert.equal(text, '');
});

test('keeps body when mode isnt no-cors on same domain', async () => {
	const fetch = create_fetch({});
	const response = await fetch('https://domain-a.com');
	const text = await response.text();
	assert.equal(text, 'foo');
});

test('succeeds when acao header present on cors', async () => {
	const fetch = create_fetch({
		fetch: async () => new Response('foo', { headers: { 'access-control-allow-origin': '*' } })
	});
	const response = await fetch('https://domain-a.com');
	const text = await response.text();
	assert.equal(text, 'foo');
});

test('errors when no acao header present on cors', async () => {
	const fetch = create_fetch({});

	expect(async () => {
		const response = await fetch('https://domain-b.com');
		await response.text();
	}).rejects.toThrowError(
		"CORS error: No 'Access-Control-Allow-Origin' header is present on the requested resource"
	);
});

test('errors when trying to access non-serialized request headers on the server', async () => {
	const fetch = create_fetch({});
	const response = await fetch('https://domain-a.com');
	assert.throws(
		() => response.headers.get('content-type'),
		/Failed to get response header "content-type" — it must be included by the `filterSerializedResponseHeaders` option/
	);
});
