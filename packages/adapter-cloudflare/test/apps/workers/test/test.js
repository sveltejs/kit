import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const base = process.env.TEST_BASE ? '/base' : '';

test('worker', async ({ page }) => {
	await page.goto(`${base}/`);
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('cloudflare:workers', async ({ request }) => {
	const res = await request.get(`${base}/env`);
	expect(await res.text()).toBe('from wrangler.jsonc');
	if (!process.env.DEV) {
		expect(res.headers()['x-instrumented']).toBe('from wrangler.jsonc');
	}
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

test('CommonJS dependencies can require Node builtins', async ({ request }) => {
	const res = await request.get(`${base}/cjs-node-builtin`);
	expect(await res.text()).toMatch(/^[0-9a-f]{16}$/);
});

test('dependencies resolve the workerd export condition', async ({ request }) => {
	const res = await request.get(`${base}/conditions`);
	expect(await res.text()).toBe('workerd');
});
