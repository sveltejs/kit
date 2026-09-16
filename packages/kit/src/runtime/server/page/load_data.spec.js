import { assert, expect, test, vi } from 'vitest';

vi.stubGlobal('__SVELTEKIT_DEV__', undefined);

const { create_universal_fetch } = await import('./load_data.js');

/**
 * @param {Partial<Pick<import('@sveltejs/kit').RequestEvent, 'fetch' | 'url' | 'request' | 'route'>>} event
 * @param {import('./types.js').Fetched[]} [fetched]
 */
function create_fetch(event, fetched = []) {
	// @ts-expect-error
	// eslint-disable-next-line @typescript-eslint/require-await
	event.fetch ||= async () => new Response('foo');
	// @ts-expect-error
	event.request ||= new Request('doesnt:matter');
	// @ts-expect-error
	event.route ||= { id: 'foo' };
	// @ts-expect-error
	event.url ||= new URL('https://domain-a.com');
	return create_universal_fetch(
		/** @type {Pick<import('@sveltejs/kit').RequestEvent, 'fetch' | 'url' | 'request' | 'route'>} */ (
			event
		),
		undefined,
		fetched,
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

test('uses init mode when overriding a Request to no-cors', async () => {
	const fetch = create_fetch({});
	const request = new Request('https://domain-b.com', { mode: 'cors' });
	const response = await fetch(request, { mode: 'no-cors' });
	assert.equal(await response.text(), '');
});

test('uses init mode when overriding a Request to cors', async () => {
	const fetch = create_fetch({
		// eslint-disable-next-line @typescript-eslint/require-await
		fetch: async () => new Response('foo', { headers: { 'access-control-allow-origin': '*' } })
	});
	const request = new Request('https://domain-b.com', { mode: 'no-cors' });
	const response = await fetch(request, { mode: 'cors' });
	assert.equal(await response.text(), 'foo');
});

test('checks CORS headers when init overrides a no-cors Request', async () => {
	const fetch = create_fetch({});
	const request = new Request('https://domain-b.com', { mode: 'no-cors' });

	await expect(fetch(request, { mode: 'cors' })).rejects.toThrowError(
		"CORS error: No 'Access-Control-Allow-Origin' header is present on the requested resource"
	);
});

test('serializes init headers instead of Request headers', async () => {
	/** @type {import('./types.js').Fetched[]} */
	const fetched = [];
	const fetch = create_fetch({}, fetched);
	const request = new Request('https://domain-a.com', { headers: { 'x-original': 'request' } });
	const response = await fetch(request, { headers: { 'x-replacement': 'init' } });
	await response.text();

	assert.lengthOf(fetched, 1);
	assert.deepEqual([...new Headers(fetched[0].request_headers)], [['x-replacement', 'init']]);
});

test('serializes empty init headers when replacing Request headers', async () => {
	/** @type {import('./types.js').Fetched[]} */
	const fetched = [];
	const fetch = create_fetch({}, fetched);
	const request = new Request('https://domain-a.com', { headers: { 'x-original': 'request' } });
	const response = await fetch(request, { headers: {} });
	await response.text();

	assert.lengthOf(fetched, 1);
	assert.deepEqual([...new Headers(fetched[0].request_headers)], []);
});

test.each([
	{ body: 'replacement', expected: 'replacement' },
	{ body: '', expected: '' },
	{ body: null, expected: 'original' },
	{ body: undefined, expected: 'original' }
])('serializes the effective Request body for init.body=$body', async ({ body, expected }) => {
	/** @type {import('./types.js').Fetched[]} */
	const fetched = [];
	const fetch = create_fetch({}, fetched);
	const request = new Request('https://domain-a.com', { method: 'POST', body: 'original' });
	const response = await fetch(request, { body });
	await response.text();

	assert.lengthOf(fetched, 1);
	assert.equal(fetched[0].request_body, expected);
});

test('can replace the body of a consumed Request', async () => {
	/** @type {import('./types.js').Fetched[]} */
	const fetched = [];
	const fetch = create_fetch(
		{
			fetch: async (input, init) => new Response(await new Request(input, init).text())
		},
		fetched
	);
	const request = new Request('https://domain-a.com', { method: 'POST', body: 'original' });
	await request.text();
	const response = await fetch(request, { body: 'replacement' });

	assert.equal(await response.text(), 'replacement');
	assert.lengthOf(fetched, 1);
	assert.equal(fetched[0].request_body, 'replacement');
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

test('errors when trying to access non-serialized set-cookie headers on the server', async () => {
	const fetch = create_fetch({
		// eslint-disable-next-line @typescript-eslint/require-await
		fetch: async () => new Response('foo', { headers: { 'set-cookie': 'a=1' } })
	});
	const response = await fetch('https://domain-a.com');
	assert.throws(
		() => response.headers.getSetCookie(),
		/Failed to get response header "set-cookie" — it must be included by the `filterSerializedResponseHeaders` option/
	);
});
