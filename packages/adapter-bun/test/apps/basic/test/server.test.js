import { expect, test } from '@playwright/test';
import process from 'node:process';

const compiled = process.env.COMPILE === 'true';

test('provides the Bun server on platform', async ({ request }) => {
	const response = await request.get('/platform');
	const platform = await response.json();

	expect(platform.address).toBeTruthy();
	expect(platform.server).toBe(true);
	expect(platform.id).toEqual(expect.any(String));
	expect(platform.protocol).toBe('http');
	expect(platform.pendingRequests).toBeGreaterThanOrEqual(1);
	expect(platform.pendingWebSockets).toBe(0);
	expect(platform.subscribers).toBe(0);
});

test('runs server instrumentation before accepting requests', async ({ request }) => {
	const response = await request.get('/instrumented');
	expect(response.status()).toBe(200);
	expect(await response.text()).toBe('true');
});

test('serves static files and implements HEAD natively', async ({ request }) => {
	const response = await request.get('/data.json');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('application/json');
	expect(await response.json()).toEqual({ message: 'hello from a static file' });

	const head = await request.head('/data.json');
	expect(head.status()).toBe(200);
	expect(head.headers()['content-length']).toBe(response.headers()['content-length']);
	expect(await head.text()).toBe('');
});

for (const [url, content_type, body] of [
	['/sub/', 'text/html;charset=utf-8', 'directory index'],
	['/encoded%20name.txt', 'text/plain;charset=utf-8', 'encoded filename'],
	['/.well-known/adapter-bun.txt', 'text/plain;charset=utf-8', 'adapter bun']
]) {
	test(`serves ${url} with its MIME type`, async ({ request }) => {
		const response = await request.get(url);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toBe(content_type);
		expect(await response.text()).toContain(body);
	});
}

test('uses Bun conditional requests and byte ranges for filesystem assets', async ({ request }) => {
	const initial = await request.get('/data.json');
	const body = await initial.text();

	if (compiled) {
		const etag = initial.headers()['etag'];
		expect(etag).toBeTruthy();
		const cached = await request.get('/data.json', { headers: { 'if-none-match': etag } });
		expect(cached.status()).toBe(304);
	} else {
		const last_modified = initial.headers()['last-modified'];
		expect(last_modified).toBeTruthy();
		const cached = await request.get('/data.json', {
			headers: { 'if-modified-since': last_modified }
		});
		expect(cached.status()).toBe(304);

		const range = await request.get('/data.json', { headers: { range: 'bytes=0-3' } });
		expect(range.status()).toBe(206);
		expect(range.headers()['accept-ranges']).toBe('bytes');
		expect(range.headers()['content-range']).toBe(`bytes 0-3/${body.length}`);
		expect(await range.text()).toBe(body.slice(0, 4));
	}
});

test('serves prerendered pages, endpoints, and canonical redirects', async ({ request }) => {
	const page = await request.get('/prerendered/');
	expect(page.status()).toBe(200);
	expect(await page.text()).toContain('Prerendered');

	const icon = await request.get('/prerendered.ico');
	expect(icon.status()).toBe(200);
	expect(icon.headers()['content-type']).toBe('image/x-icon');
	expect(await icon.body()).toEqual(Buffer.from([0, 0, 1, 0]));

	const redirect = await request.get('/prerendered?via=test', { maxRedirects: 0 });
	expect(redirect.status()).toBe(308);
	expect(redirect.headers()['location']).toBe('/prerendered/?via=test');
});

test('uses SvelteKit for non-GET requests that share a static pathname', async ({ request }) => {
	const response = await request.post('/data.json', {
		headers: { origin: 'http://localhost:4174' }
	});
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ message: 'hello from a server endpoint' });
});

test('makes imported assets available to $app/server read', async ({ request }) => {
	const response = await request.get('/read');
	expect(response.status()).toBe(200);
	expect(await response.text()).toBe('Hello from $app/server read\n');
});

test('sets immutable caching only on generated immutable assets', async ({ request }) => {
	const document = await request.get('/');
	const asset = /["']([^"']*_app\/immutable\/[^"']+)["']/.exec(await document.text())?.[1];
	expect(asset).toBeTruthy();

	const immutable = await request.get(/** @type {string} */ (asset));
	expect(immutable.headers()['cache-control']).toBe('public,max-age=31536000,immutable');

	const regular = await request.get('/data.json');
	expect(regular.headers()['cache-control']).toBeUndefined();
});

test('disables timeouts and proxy buffering for server-sent events', async ({ request }) => {
	const events = await request.get('/event-stream');
	expect(events.headers()['content-type']).toContain('text/event-stream');
	expect(events.headers()['x-accel-buffering']).toBe('no');

	const regular = await request.get('/platform');
	expect(regular.headers()['x-accel-buffering']).toBeUndefined();
});
