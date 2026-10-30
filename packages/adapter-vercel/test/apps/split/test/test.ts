import { expect, test } from '@playwright/test';

test('split functions work', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');
	await page.goto('/a');
	await expect(page.locator('p')).toContainText(/split config/);
});

test('reroute works', async ({ page }) => {
	await page.goto('/reroute');
	await expect(page.locator('p')).toContainText('/reroute');
	await page.goto('/en/reroute?hello=world');
	await expect(page.locator('p')).toContainText('/en/reroute?hello=world');
});

// TODO: test remote function works

// TODO: test preloadCode works

test('prerendered pages are served without a trailing slash', async ({ request }) => {
	for (const [pathname, slug] of [
		['/prerendered/a', 'a'],
		['/prerendered/caf%C3%A9', 'café'],
		['/prerendered/v1.2', 'v1.2']
	]) {
		const response = await request.get(pathname, { maxRedirects: 0 });
		expect(response.status()).toBe(200);
		expect(await response.text()).toContain(`prerendered: ${slug}`);
	}
});

test('prerendered pages redirect to remove the trailing slash', async ({ request }) => {
	for (const pathname of ['/prerendered/a', '/prerendered/caf%C3%A9', '/prerendered/v1.2']) {
		const response = await request.get(`${pathname}/`, { maxRedirects: 0 });
		expect(response.status()).toBe(308);
		expect(response.headers()['location']).toBe(pathname);
	}
});

test('dynamic pages redirect to remove the trailing slash', async ({ request }) => {
	const response = await request.get('/a/', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(response.headers()['location']).toBe('/a');
});

test('trailing slash redirects preserve the query string', async ({ request }) => {
	const response = await request.get('/prerendered/a/?foo=bar', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(response.headers()['location']).toBe('/prerendered/a?foo=bar');
});

test('rerouted pages redirect to remove the trailing slash', async ({ request }) => {
	const response = await request.get('/en/reroute/', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(response.headers()['location']).toBe('/en/reroute');
});
