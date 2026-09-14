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

test('loads external dependencies', async ({ request }) => {
	const response = await request.get('/external-dependency');
	expect(await response.text()).toBe('server-side-dep implementation');
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

test('preserves similar user identifiers and imports', async ({ request }) => {
	const response = await request.get('/adapter-identifiers');
	expect(await response.json()).toEqual({
		BASE_PATH: 'user-base-path',
		APP_PATH: 'user-app-path',
		ENV_PREFIX: 'user-env-prefix',
		PRECOMPRESS: 'user-precompress',
		SERVER: 'user-server'
	});
});

test('records which assets have compressed variants', async ({ request }) => {
	expect((await request.get('/data.json')).headers()['vary']).toBe('Accept-Encoding');
	expect((await request.get('/test.ico')).headers()['vary']).toBeUndefined();
});

test('records the size, content hash and compressed variants of each file', async ({ request }) => {
	expect(await (await request.get('/a+b.txt')).text()).toBe('plus');

	const identity = await request.get('/range.txt', { headers: { 'accept-encoding': 'identity' } });
	expect(identity.headers()['content-length']).toBe('10');
	const etag = identity.headers()['etag'];
	expect(etag).toBeTruthy();
	const cached = await request.get('/range.txt', {
		headers: { 'accept-encoding': 'identity', 'if-none-match': etag }
	});
	expect(cached.status()).toBe(304);

	const gzip = await request.get('/range.txt', { headers: { 'accept-encoding': 'gzip' } });
	expect(gzip.headers()['content-encoding']).toBe('gzip');
	expect(await gzip.text()).toBe('0123456789');
	expect(gzip.headers()['etag']).not.toBe(etag);
});

test('records aliases for html files', async ({ request }) => {
	for (const path of ['/page', '/sub/']) {
		const response = await request.get(path);
		expect(response.status(), path).toBe(200);
		expect(response.headers()['content-type']).toBe('text/html;charset=utf-8');
	}
});

test('uses the content types from the manifest', async ({ request }) => {
	// https://github.com/sveltejs/kit/issues/13753
	expect((await request.get('/test.ico')).headers()['content-type']).toBe('image/x-icon');
	expect((await request.get('/prerendered.ico')).headers()['content-type']).toBe('image/x-icon');
});

test('does not replace adapter stubs in application chunks', async ({ request }) => {
	const response = await request.get('/stub');
	expect(await response.text()).toBe('__SVELTEKIT_ADAPTER_NODE_MIMETYPES__');
});

test('does not record dotfiles, except .well-known', async ({ request }) => {
	expect((await request.get('/.hidden')).status()).toBe(404);
	expect(await (await request.get('/.well-known/thing.txt')).text()).toBe('wk');
});

test('serves prerendered pages and redirects to their canonical path', async ({ request }) => {
	const page = await request.get('/prerendered-page');
	expect(page.headers()['content-type']).toBe('text/html;charset=utf-8');
	expect(await page.text()).toContain('prerendered');

	const redirect = await request.get('/prerendered-page/', { maxRedirects: 0 });
	expect(redirect.status()).toBe(308);
	expect(redirect.headers()['location']).toBe('../prerendered-page');
});

test('serves immutable assets with an immutable cache header', async ({ request }) => {
	const html = await (await request.get('/')).text();
	const [asset] = /** @type {RegExpMatchArray} */ (html.match(/\/_app\/immutable\/[^"']+\.js/));

	const response = await request.get(asset);
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('public,max-age=31536000,immutable');
});
