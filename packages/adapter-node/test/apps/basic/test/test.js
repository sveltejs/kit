import { expect, test } from '@playwright/test';

test('SSR', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello world!');
});

test('CSR', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('button')).toContainText('Toggle: false');
	await page.locator('button').click();
	await expect(page.locator('button')).toContainText('Toggle: true');
});

test('sets X-Accel-Buffering header on text/event-stream responses', async ({ request }) => {
	const response = await request.get('/event-stream');
	expect(response.headers()['content-type']).toContain('text/event-stream');
	expect(response.headers()['x-accel-buffering']).toBe('no');
});

test('does not set X-Accel-Buffering header on other responses', async ({ request }) => {
	const response = await request.get('/');
	expect(response.headers()['x-accel-buffering']).toBeUndefined();
});

test('initializes dynamic env before instrumentation', async ({ request }) => {
	const response = await request.get('/instrumentation-env');
	expect(await response.json()).toEqual({ value: 'available' });
});

test('sets Vary on assets that were precompressed', async ({ request }) => {
	const response = await request.get('/data.json');
	expect(response.status()).toBe(200);
	expect(response.headers()['vary']).toBe('Accept-Encoding');
});

test('does not set Vary on assets that were not precompressed', async ({ request }) => {
	const response = await request.get('/test.ico');
	expect(response.status()).toBe(200);
	expect(response.headers()['vary']).toBeUndefined();
});

// an extensionless pathname can still resolve to a precompressed `index.html`
test('sets Vary on assets reached without an extension', async ({ request }) => {
	const response = await request.get('/sub/');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
	expect(response.headers()['vary']).toBe('Accept-Encoding');
});

// a dot in the final path segment looks like an extension but isn't one
test('sets Vary on assets reached via a dotted path segment', async ({ request }) => {
	const response = await request.get('/v1.0/');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
	expect(response.headers()['vary']).toBe('Accept-Encoding');
});

test('serves static files with the Content-Type from the manifest', async ({ request }) => {
	// https://github.com/sveltejs/kit/issues/13753
	const response = await request.get('/test.ico');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('image/x-icon');
});

test('serves prerendered endpoints with the Content-Type from the manifest', async ({
	request
}) => {
	const response = await request.get('/prerendered.ico');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('image/x-icon');
});

test('serves static HTML with a charset', async ({ request }) => {
	const response = await request.get('/page.html');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
});

test('serves files with a + in the name', async ({ request }) => {
	// https://github.com/sveltejs/kit/issues/11766
	const response = await request.get('/a+b.txt');
	expect(response.status()).toBe(200);
	expect(await response.text()).toBe('plus');
});

test('does not serve dotfiles', async ({ request }) => {
	const response = await request.get('/.hidden');
	expect(response.status()).toBe(404);
});

test('serves .well-known', async ({ request }) => {
	const response = await request.get('/.well-known/thing.txt');
	expect(response.status()).toBe(200);
	expect(await response.text()).toBe('wk');
});

test('serves a content-hash ETag and honours if-none-match', async ({ request }) => {
	const response = await request.get('/range.txt');
	const etag = response.headers()['etag'];
	expect(etag).toBeTruthy();

	const cached = await request.get('/range.txt', { headers: { 'if-none-match': etag } });
	expect(cached.status()).toBe(304);
});

test('responds to HEAD without a body', async ({ request }) => {
	const response = await request.head('/range.txt', {
		headers: { 'accept-encoding': 'identity' }
	});
	expect(response.status()).toBe(200);
	expect(response.headers()['content-length']).toBe('10');
	expect(await response.text()).toBe('');
});

test('serves a single-byte range', async ({ request }) => {
	// the probe HTML5 video and PDF.js use to detect range support
	const response = await request.get('/range.txt', {
		headers: { 'accept-encoding': 'identity', range: 'bytes=0-0' }
	});
	expect(response.status()).toBe(206);
	expect(response.headers()['content-range']).toBe('bytes 0-0/10');
	expect(await response.text()).toBe('0');
});

test('serves a suffix range', async ({ request }) => {
	const response = await request.get('/range.txt', {
		headers: { 'accept-encoding': 'identity', range: 'bytes=-3' }
	});
	expect(response.status()).toBe(206);
	expect(response.headers()['content-range']).toBe('bytes 7-9/10');
	expect(await response.text()).toBe('789');
});

test('serves an open-ended range', async ({ request }) => {
	const response = await request.get('/range.txt', {
		headers: { 'accept-encoding': 'identity', range: 'bytes=4-' }
	});
	expect(response.status()).toBe(206);
	expect(await response.text()).toBe('456789');
});

test('rejects an unsatisfiable range', async ({ request }) => {
	const response = await request.get('/range.txt', {
		headers: { 'accept-encoding': 'identity', range: 'bytes=10-' }
	});
	expect(response.status()).toBe(416);
	expect(response.headers()['content-range']).toBe('bytes */10');
});

test('serves a prerendered page', async ({ request }) => {
	const response = await request.get('/prerendered-page');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
	expect(await response.text()).toContain('prerendered');
});

test('redirects to the canonical prerendered path', async ({ request }) => {
	const response = await request.get('/prerendered-page/', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(response.headers()['location']).toBe('../prerendered-page');
});

test('resolves an extensionless path to the matching .html file', async ({ request }) => {
	const response = await request.get('/page');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
});

test('serves immutable assets with an immutable cache header', async ({ request }) => {
	const html = await (await request.get('/')).text();
	const [asset] = /** @type {RegExpMatchArray} */ (html.match(/\/_app\/immutable\/[^"']+\.js/));

	const response = await request.get(asset);
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('public,max-age=31536000,immutable');
});

test('does not serve version.json with an immutable cache header', async ({ request }) => {
	const response = await request.get('/_app/version.json');
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBeUndefined();
});

test('serves the gzip variant when brotli is not accepted', async ({ request }) => {
	const response = await request.get('/range.txt', { headers: { 'accept-encoding': 'gzip' } });
	expect(response.status()).toBe(200);
	expect(response.headers()['content-encoding']).toBe('gzip');
	expect(response.headers()['vary']).toBe('Accept-Encoding');
});
