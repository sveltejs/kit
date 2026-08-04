import { expect, test } from '@playwright/test';

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
});

test('serves static files with Bun file responses', async ({ request }) => {
	const response = await request.get('/data.json', {
		headers: { 'accept-encoding': 'identity' }
	});
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('application/json');
	expect(response.headers()['accept-ranges']).toBe('bytes');
	expect(response.headers()['vary']).toBe('Accept-Encoding');
	expect(await response.json()).toEqual({ message: 'hello from a static file' });
});

test('supports ranges and conditional requests for static files', async ({ request }) => {
	const initial = await request.get('/data.json', {
		headers: { 'accept-encoding': 'identity' }
	});
	const etag = initial.headers()['etag'];
	const last_modified = initial.headers()['last-modified'];
	const body = await initial.text();
	expect(etag).toBeTruthy();
	expect(last_modified).toBeTruthy();

	const not_modified = await request.get('/data.json', {
		headers: { 'accept-encoding': 'identity', 'if-none-match': etag }
	});
	expect(not_modified.status()).toBe(304);
	const not_modified_since = await request.get('/data.json', {
		headers: { 'accept-encoding': 'identity', 'if-modified-since': last_modified }
	});
	expect(not_modified_since.status()).toBe(304);

	const range = await request.get('/data.json', {
		headers: { 'accept-encoding': 'identity', range: 'bytes=0-3' }
	});
	expect(range.status()).toBe(206);
	expect(range.headers()['content-range']).toBe(`bytes 0-3/${body.length}`);
	expect(await range.text()).toBe(body.slice(0, 4));
});

test('does not serve static files for non-GET requests', async ({ request }) => {
	const response = await request.post('/data.json');
	expect(response.status()).not.toBe(200);
	expect(await response.text()).not.toContain('hello from a static file');
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
