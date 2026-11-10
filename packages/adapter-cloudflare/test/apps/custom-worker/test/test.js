import fs from 'node:fs';
import process from 'node:process';
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

test('SvelteKit shares module state with the custom Worker', async ({ request }) => {
	const first = await (await request.get('/state')).json();
	const second = await (await request.get('/state')).json();

	// the worker creates the marker before sveltekit handles any request
	expect(first.marker).toBe(true);
	// other tests send requests to the worker at the same time
	expect(second.worker_requests).toBeGreaterThan(first.worker_requests);
});

test('SvelteKit renders the page CSS', async ({ page, request }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveCSS('color', 'rgb(255, 0, 0)');

	if (process.env.DEV) {
		// inlined in dev to avoid a flash of unstyled content
		const html = await (await request.get('/')).text();
		expect(html).toContain('<style data-sveltekit>');
	}
});

test('SvelteKit calls remote functions in the module graph of the custom Worker', async ({
	page
}) => {
	await page.goto('/remote');
	await expect(page.locator('#marker')).toHaveText('true');

	await page.locator('button').click();
	await expect(page.locator('button')).toHaveText('1');
});

test('SvelteKit serves imported assets', async ({ page }) => {
	await page.goto('/asset');
	await expect(page.locator('img')).not.toHaveAttribute('src', /^data:/);
	await expect
		.poll(() => page.locator('img').evaluate((img) => img.complete && img.naturalWidth))
		.toBe(10);
});

test('SvelteKit reads imported assets with `read`', async ({ request }) => {
	const res = await request.get('/asset/read');
	expect(res.headers()['content-type']).toBe('image/svg+xml');
	expect(await res.text()).toContain('<rect width="10" height="10" fill="red"/>');

	// workerd does not send it for streamed responses, so this checks what read returns
	const length = await (await request.get('/asset/length')).text();
	expect(length).toBe(
		String(fs.statSync(new URL('../src/routes/asset/logo.svg', import.meta.url)).size)
	);
});

test('SvelteKit serves the service worker', async ({ request }) => {
	const res = await request.get('/service-worker.js');
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('javascript');
});
