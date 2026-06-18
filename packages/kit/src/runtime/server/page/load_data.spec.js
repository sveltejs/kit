import { assert, expect, test } from 'vitest';
import { create_universal_fetch } from './load_data.js';
import { create_mock_event } from '../../../../test/mocks/server.js';

/**
 * @param {Partial<import('@sveltejs/kit').RequestEvent>} [overrides]
 */
function create_fetch(overrides) {
	const event = create_mock_event({
		url: new URL('https://domain-a.com'),
		route: { id: 'foo' },
		// eslint-disable-next-line @typescript-eslint/require-await
		fetch: async () => new Response('foo'),
		...overrides
	});

	// note: the second argument is not a `RequestState` — `create_universal_fetch`
	// takes a small fetch-specific state object
	return create_universal_fetch(
		event,
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

test("keeps body when mode isn't no-cors on same domain", async () => {
	const fetch = create_fetch({});
	const response = await fetch('https://domain-a.com');
	const text = await response.text();
	assert.equal(text, 'foo');
});

test('succeeds when acao header present on cors', async () => {
	const fetch = create_fetch({
		// eslint-disable-next-line @typescript-eslint/require-await
		fetch: async () => new Response('foo', { headers: { 'access-control-allow-origin': '*' } })
	});
	const response = await fetch('https://domain-a.com');
	const text = await response.text();
	assert.equal(text, 'foo');
});

test('errors when no acao header present on cors', async () => {
	const fetch = create_fetch({});

	await expect(async () => {
		const response = await fetch('https://domain-b.com');
		await response.text();
	}).rejects.toThrowError(
		"CORS error: No 'Access-Control-Allow-Origin' header is present on the requested resource"
	);
});

test('succeeds when fetching from local scheme', async () => {
	const fetch = create_fetch({});
	const response = await fetch('data:text/plain;foo');
	const text = await response.text();
	assert.equal(text, 'foo');
});

test('errors when trying to access non-serialized request headers on the server', async () => {
	const fetch = create_fetch({});
	const response = await fetch('https://domain-a.com');
	assert.throws(
		() => response.headers.get('content-type'),
		/Failed to get response header "content-type" — it must be included by the `filterSerializedResponseHeaders` option/
	);
});
