import { expect, test } from '@playwright/test';

test('basic page renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');
});

test('server-side data loading works', async ({ page }) => {
	await page.goto('/server-data');
	await expect(page.locator('h1')).toContainText('loaded on server');
	const timestamp = await page.locator('#timestamp').textContent();
	expect(Number(timestamp)).toBeGreaterThan(0);
});

test('API routes work', async ({ request }) => {
	const response = await request.get('/api/json');
	expect(response.ok()).toBe(true);
	const data = await response.json();
	expect(data.ok).toBe(true);
});

test('$app/server read works', async ({ request }) => {
	const response = await request.get('/read');
	expect(response.ok()).toBe(true);
	const text = await response.text();
	expect(text).toContain('Hello from $app/server read');
});

test('ISR route serves cached response', async ({ request }) => {
	// first request warms the cache
	const first = await request.get('/isr');
	expect(first.ok()).toBe(true);
	const first_html = await first.text();
	const first_match = first_html.match(/id="rendered-at">(\d+)</);
	expect(first_match).not.toBeNull();
	const first_rendered_at = first_match![1];

	// second request should be served from ISR cache (same rendered_at)
	const second = await request.get('/isr');
	expect(second.ok()).toBe(true);
	const second_html = await second.text();
	const second_match = second_html.match(/id="rendered-at">(\d+)</);
	expect(second_match).not.toBeNull();
	const second_rendered_at = second_match![1];

	expect(first_rendered_at).toBe(second_rendered_at);
});

test('ISR dynamic route serves cached response per slug', async ({ request }) => {
	// warm the cache for /isr/alpha
	const first = await request.get('/isr/alpha');
	expect(first.ok()).toBe(true);
	const first_html = await first.text();
	expect(first_html).toContain('ISR: alpha');
	const first_match = first_html.match(/id="rendered-at">(\d+)</);
	expect(first_match).not.toBeNull();
	const alpha_rendered_at = first_match![1];

	// second request to same slug should return cached response
	const second = await request.get('/isr/alpha');
	const second_html = await second.text();
	const second_match = second_html.match(/id="rendered-at">(\d+)</);
	expect(second_match![1]).toBe(alpha_rendered_at);

	// different slug should be independently rendered
	const beta = await request.get('/isr/beta');
	expect(beta.ok()).toBe(true);
	const beta_html = await beta.text();
	expect(beta_html).toContain('ISR: beta');
});

test('prerendered page works', async ({ page }) => {
	await page.goto('/prerendered');
	await expect(page.locator('h1')).toContainText('this page is prerendered');
});

test('prerendered page trailing slash redirects', async ({ request }) => {
	const response = await request.get('/prerendered/', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
	expect(response.headers()['location']).toBe('/prerendered');
});

test('deeply nested route works', async ({ page }) => {
	await page.goto('/deep/nested/route');
	await expect(page.locator('h1')).toContainText('Deep nested route');
	expect(await page.locator('#depth').textContent()).toBe('3');
	expect(await page.locator('#path').textContent()).toBe('/deep/nested/route');
});

test('client-side navigation works (validates __data.json)', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');

	// click a link to trigger client-side navigation (fetches __data.json)
	await page.click('a[href="/server-data"]');
	await expect(page.locator('h1')).toContainText('loaded on server');

	// navigate to another page via client-side nav
	await page.goBack();
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');

	await page.click('a[href="/deep/nested/route"]');
	await expect(page.locator('h1')).toContainText('Deep nested route');
});

test('client-side navigation to ISR routes works', async ({ page }) => {
	await page.goto('/');

	await page.click('a[href="/isr/hello"]');
	await expect(page.locator('h1')).toContainText('ISR: hello');
});

test('client-side navigation to prerendered routes works', async ({ page }) => {
	await page.goto('/');

	await page.click('a[href="/prerendered"]');
	await expect(page.locator('h1')).toContainText('this page is prerendered');
});
