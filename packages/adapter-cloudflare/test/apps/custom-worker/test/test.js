import { expect, test } from '@playwright/test';

test('the custom Worker handles requests before SvelteKit', async ({ request }) => {
	const res = await request.get('/worker');
	expect(await res.text()).toBe('from the custom Worker');
});

test('SvelteKit renders pages through the custom Worker', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.headers()['x-custom-worker']).toBe('true');
	await expect(page.locator('h1')).toHaveText('rendered by SvelteKit');
});

test('SvelteKit uses the Durable Object exported by the custom Worker', async ({ request }) => {
	const first = Number(await (await request.post('/counter')).text());
	const second = Number(await (await request.post('/counter')).text());
	expect(second).toBe(first + 1);
});

test('SvelteKit reads bindings from cloudflare.config.ts', async ({ request }) => {
	const res = await request.get('/env');
	expect(await res.text()).toBe('from cloudflare.config.ts');
});

test('SvelteKit receives the request URL and `cf` properties', async ({ request, baseURL }) => {
	const origin = await (await request.get('/origin')).text();
	expect(origin).toBe(new URL(/** @type {string} */ (baseURL)).origin);

	const cf = await (await request.get('/cf')).json();
	expect(cf.colo).toBeDefined();
});

test('SvelteKit receives the request body', async ({ request }) => {
	const res = await request.post('/echo', { data: 'hello' });
	expect(await res.text()).toBe('hello');
});

test('SvelteKit runs instrumentation.server.js', async ({ request }) => {
	const res = await request.get('/instrumented');
	expect(await res.text()).toBe('instrumented');
});
