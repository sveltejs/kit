import { expect, test } from '@playwright/test';
import process from 'node:process';

const compiled = process.env.COMPILE === 'true';

test('renders and hydrates the app', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Hello from Bun!');
	await expect(page.locator('button')).toHaveText('Toggle: false');
	await page.locator('button').click();
	await expect(page.locator('button')).toHaveText('Toggle: true');
});

test('provides Bun request context', async ({ request }) => {
	const response = await request.get('/platform');
	const body = await response.json();
	expect(body.address).toBeTruthy();
	expect(body.request).toBe(true);
	expect(body.server).toBe(true);
	expect(typeof body.id).toBe('string');
	expect(body.protocol).toBe('http');
	expect(body.pendingRequests).toBeGreaterThanOrEqual(1);
	expect(body.pendingWebSockets).toBe(0);
	expect(body.subscribers).toBe(0);
});

test('serves static files with Bun file responses', async ({ request }) => {
	const response = await request.get('/data.json');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('application/json');
	expect(await response.json()).toEqual({ message: 'hello from a static file' });

	const head = await request.head('/data.json');
	expect(head.status()).toBe(200);
	expect(head.headers()['content-length']).toBe(response.headers()['content-length']);
	expect(await head.text()).toBe('');
});

test('uses Bun validators and ranges for static files', async ({ request }) => {
	const initial = await request.get('/data.json');
	const body = await initial.text();

	if (compiled) {
		const etag = initial.headers()['etag'];
		expect(etag).toBeTruthy();

		const not_modified = await request.get('/data.json', {
			headers: { 'if-none-match': etag }
		});
		expect(not_modified.status()).toBe(304);
	} else {
		const last_modified = initial.headers()['last-modified'];
		expect(last_modified).toBeTruthy();

		const not_modified = await request.get('/data.json', {
			headers: { 'if-modified-since': last_modified }
		});
		expect(not_modified.status()).toBe(304);

		const range = await request.get('/data.json', {
			headers: { range: 'bytes=0-3' }
		});
		expect(range.status()).toBe(206);
		expect(range.headers()['accept-ranges']).toBe('bytes');
		expect(range.headers()['content-range']).toBe(`bytes 0-3/${body.length}`);
		expect(await range.text()).toBe(body.slice(0, 4));
	}
});

test('serves URL-encoded static filenames', async ({ request }) => {
	const response = await request.get('/encoded%20name.txt');
	expect(response.status()).toBe(200);
	expect(await response.text()).toBe('hello from an encoded filename\n');
});

test('caches immutable client assets', async ({ request }) => {
	const page = await request.get('/');
	const asset = /["']([^"']*_app\/immutable\/[^"']+)["']/.exec(await page.text())?.[1];
	expect(asset).toBeTruthy();

	const asset_response = await request.get(/** @type {string} */ (asset));
	expect(asset_response.headers()['cache-control']).toBe('public,max-age=31536000,immutable');
});

test('uses Bun route method semantics for static files', async ({ request }) => {
	const response = await request.post('/data.json');
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ message: 'hello from a static file' });
});

test('redirects prerendered paths to their canonical trailing slash', async ({ request }) => {
	const response = await request.get('/prerendered?value=1', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(response.headers()['location']).toBe('prerendered/?value=1');
});

test('configures long-lived event streams', async ({ request }) => {
	const response = await request.get('/event-stream');
	expect(response.headers()['content-type']).toContain('text/event-stream');
	expect(response.headers()['x-accel-buffering']).toBe('no');
});
