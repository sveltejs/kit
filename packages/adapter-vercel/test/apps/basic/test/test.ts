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

test('dynamic env is available in instrumentation', async ({ request }) => {
	const response = await request.get('/instrumentation-env');
	expect(response.ok()).toBe(true);
	expect(await response.json()).toEqual({ loaded: true });
});

test('$app/server read works', async ({ request }) => {
	const response = await request.get('/read');
	expect(response.ok()).toBe(true);
	const text = await response.text();
	expect(text).toContain('Hello from $app/server read');
});

test('non-cacheable methods bypass ISR', async ({ request }) => {
	for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'QUERY']) {
		const body = method === 'OPTIONS' ? undefined : crypto.randomUUID();
		const response = await request.fetch('/isr-endpoint', { method, data: body });
		expect(response.ok()).toBe(true);
		expect(await response.json()).toEqual({ method, body: body ?? '' });
	}
});

test('ISR form actions bypass ISR', async ({ page }) => {
	await page.goto('/isr');
	await page.getByRole('button', { name: 'Submit' }).click();
	await expect(page.locator('#form-success')).toHaveText('success');
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

test('ISR page with trailingSlash always loads without errors', async ({ page, request }) => {
	await page.goto('/isr-trailing-slash/');

	expect(new URL(page.url()).pathname).toBe('/isr-trailing-slash/');
	await expect(page.locator('h1')).toContainText('ISR Trailing Slash Page');

	const rendered_at = await page.locator('#rendered-at').textContent();
	await page.reload();
	await expect(page.locator('#rendered-at')).toHaveText(String(rendered_at));

	const response = await request.get('/isr-trailing-slash', { maxRedirects: 0 });
	expect(response.status()).toBe(308);
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

	// trailing slash is normalized rather than silently served
	const slashed = await request.get('/isr/alpha/', { maxRedirects: 0 });
	expect(slashed.status()).toBe(308);
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

test('missing immutable asset returns 404 with no-store cache-control', async ({ request }) => {
	// https://github.com/sveltejs/kit/pull/16077 — the 404 must not inherit the
	// immutable `max-age=31536000` header, otherwise it's cached for a year
	const response = await request.get('/_app/immutable/chunks/nonexistent.js');
	expect(response.status()).toBe(404);
	expect(response.headers()['cache-control']).toBe('no-store');
});

test('valid immutable asset is still cached immutably', async ({ page, request }) => {
	await page.goto('/');
	// immutable assets are preloaded via <link rel="modulepreload">, not <script src>
	const href = await page
		.locator('link[rel="modulepreload"][href*="/_app/immutable/"]')
		.first()
		.getAttribute('href');
	expect(href).toBeTruthy();
	const response = await request.get(href!.replace(/^\.\//, '/'));
	expect(response.ok()).toBe(true);
	expect(response.headers()['cache-control']).toBe('public, immutable, max-age=31536000');
});
