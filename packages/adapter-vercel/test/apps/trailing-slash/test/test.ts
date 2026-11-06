import { type APIResponse, expect, test } from '@playwright/test';

/**
 * Redirects from SvelteKit are relative, while those from Vercel's routing are not
 */
function redirect_location(response: APIResponse) {
	const url = new URL(response.headers()['location'], response.url());
	return url.pathname + url.search;
}

test('root page renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');
});

test('prerendered pages are served with a trailing slash', async ({ request }) => {
	for (const [pathname, slug] of [
		['/prerendered/a/', 'a'],
		['/prerendered/caf%C3%A9/', 'café'],
		['/prerendered/v1.2/', 'v1.2']
	]) {
		const response = await request.get(pathname, { maxRedirects: 0 });
		expect(response.status()).toBe(200);
		expect(await response.text()).toContain(`prerendered: ${slug}`);
	}
});

test('prerendered pages redirect to add the trailing slash', async ({ request }) => {
	for (const pathname of ['/prerendered/a', '/prerendered/caf%C3%A9', '/prerendered/v1.2']) {
		const response = await request.get(pathname, { maxRedirects: 0 });
		expect(response.status()).toBe(308);
		expect(redirect_location(response)).toBe(`${pathname}/`);
	}
});

test('trailing slash redirects preserve the query string', async ({ request }) => {
	const response = await request.get('/prerendered/a?foo=bar', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(redirect_location(response)).toBe('/prerendered/a/?foo=bar');
});

test('dynamic pages are served with a trailing slash', async ({ page }) => {
	await page.goto('/server-data/');
	expect(new URL(page.url()).pathname).toBe('/server-data/');
	await expect(page.locator('h1')).toContainText('loaded on server');
});

test('dynamic pages redirect to add the trailing slash', async ({ request }) => {
	const response = await request.get('/server-data', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(redirect_location(response)).toBe('/server-data/');
});

test('endpoints are served with a trailing slash', async ({ request }) => {
	const response = await request.get('/api/', { maxRedirects: 0 });
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ ok: true });

	const redirect = await request.get('/api', { maxRedirects: 0 });
	expect(redirect.status()).toBe(308);
	expect(redirect_location(redirect)).toBe('/api/');
});

test('static assets are not redirected', async ({ request }) => {
	for (const pathname of ['/robots.txt', '/no-extension', '/_app/version.json']) {
		const response = await request.get(pathname, { maxRedirects: 0 });
		expect(response.status()).toBe(200);
	}
});

test('client-side navigation works (validates __data.json)', async ({ page }) => {
	await page.goto('/');

	await page.click('a[href="/server-data/"]');
	await expect(page.locator('h1')).toContainText('loaded on server');
	expect(new URL(page.url()).pathname).toBe('/server-data/');

	await page.goBack();
	await page.click('a[href="/prerendered/a/"]');
	await expect(page.locator('h1')).toContainText('prerendered: a');
});
