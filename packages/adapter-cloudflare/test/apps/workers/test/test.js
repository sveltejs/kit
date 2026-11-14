import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import * as stub from '../../../../src/virtual-cloudflare-workers.js';

const base = process.env.TEST_BASE ? '/base' : '';

test('worker', async ({ page }) => {
	await page.goto(`${base}/`);
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('cloudflare:workers', async ({ request }) => {
	const res = await request.get(`${base}/env`);
	expect(await res.text()).toBe('from cloudflare.config.ts');
	expect(res.headers()['x-instrumented']).toBe('from cloudflare.config.ts');
});

test('$app/env/private reads text bindings from cloudflare.config.ts', async ({ request }) => {
	const res = await request.get('/env/private');
	expect(await res.text()).toBe('from cloudflare.config.ts');
});

test('Request.cf', async ({ request }) => {
	const res = await request.get(`${base}/cf`);
	const cf = await res.json();
	expect(cf.colo).toBeDefined();
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get(`${base}/read`);
	expect(await response.text()).toBe(content);
});

test('static and prerendered assets', async ({ request }) => {
	const asset = await request.get(`${base}/asset.txt`);
	expect(await asset.text()).toBe('static asset\n');
	if (!process.env.DEV) {
		expect(asset.headers()['x-static-asset']).toBe('true');
		const redirect = await request.get(`${base}/redirect.txt`, { maxRedirects: 0 });
		expect(redirect.status()).toBe(302);
		expect(redirect.headers().location).toBe(`${base}/asset.txt`);
	}
	const prerendered = await request.get(`${base}/static`);
	expect(await prerendered.text()).toBe('prerendered response');
});

test('prerendering throws', async ({ request }) => {
	test.skip(!!process.env.DEV);
	const res = await request.get(`${base}/prerender`);
	expect(await res.text()).toContain('Cannot access cloudflare:workers in a prerenderable route');
});

test('cloudflare:workers classes can be extended', async ({ request }) => {
	const res = await request.get(`${base}/classes`);
	expect(await res.json()).toEqual(['DurableObject', 'WorkerEntrypoint']);
});

test('the cloudflare:workers stub has the same exports as the real module', async ({ request }) => {
	const res = await request.get(`${base}/exports`);
	expect(Object.keys(stub).sort()).toEqual((await res.json()).sort());
});

test('CommonJS dependencies can require Node builtins', async ({ request }) => {
	const res = await request.get(`${base}/cjs-node-builtin`);
	expect(await res.text()).toMatch(/^[0-9a-f]{16}$/);
});

test('dependencies resolve the workerd export condition', async ({ request }) => {
	const res = await request.get(`${base}/conditions`);
	expect(await res.text()).toBe('workerd');
});

test('SvelteKit runs in workerd', async ({ request }) => {
	const res = await request.get(`${base}/runtime`);
	expect(await res.text()).toBe('Cloudflare-Workers');
});

test('remote functions run in workerd', async ({ page }) => {
	await page.goto(`${base}/remote`);
	await expect(page.locator('#runtime')).toHaveText('Cloudflare-Workers');

	await page.locator('button').click();
	await expect(page.locator('button')).toHaveText('1');
});

test('imported assets are served', async ({ page }) => {
	await page.goto(`${base}/asset`);
	await expect(page.locator('img')).not.toHaveAttribute('src', /^data:/);
	await expect
		.poll(() => page.locator('img').evaluate((img) => img.complete && img.naturalWidth))
		.toBe(10);
});

test('read from $app/server knows the size of the file', async ({ request }) => {
	// workerd does not send it for streamed responses, so this checks what read returns
	const length = await (await request.get(`${base}/asset/length`)).text();
	expect(length).toBe(
		String(fs.statSync(path.resolve(import.meta.dirname, '../src/routes/asset/logo.svg')).size)
	);
});

test('the service worker is served', async ({ request }) => {
	const res = await request.get(`${base}/service-worker.js`);
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('javascript');
});
