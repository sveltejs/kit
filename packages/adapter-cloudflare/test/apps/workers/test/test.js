import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('worker', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('cloudflare:workers', async ({ request }) => {
	const res = await request.get('/env');
	expect(await res.text()).toBe('from wrangler.jsonc');
});

test('Request.cf', async ({ request }) => {
	const res = await request.get('cf');
	const cf = await res.json();
	expect(cf.colo).toBeDefined();
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('prerendering throws', async ({ request }) => {
	test.skip(!!process.env.DEV);
	const res = await request.get('/prerender');
	expect(await res.text()).toContain('Cannot access `get` on the `KV` binding during the build');
});

test('env can be read at the top level of a module', async ({ request }) => {
	const res = await request.get('/top-level');
	expect(await res.json()).toEqual({ greeting: 'from wrangler.jsonc', kv: 'object' });
});

test('prerendering reads vars', async ({ page }) => {
	await page.goto('/prerendered');
	await expect(page.locator('h1')).toHaveText('from wrangler.jsonc');
});
