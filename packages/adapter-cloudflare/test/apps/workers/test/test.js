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

test('$app/env/private reads Wrangler vars', async ({ request }) => {
	const res = await request.get('/env/private');
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
	expect(await res.text()).toContain('Cannot access cloudflare:workers in a prerenderable route');
});

test('CommonJS dependencies can require Node builtins', async ({ request }) => {
	const res = await request.get('/cjs-node-builtin');
	expect(await res.text()).toMatch(/^[0-9a-f]{16}$/);
});

test('dependencies resolve the workerd export condition', async ({ request }) => {
	const res = await request.get('/conditions');
	expect(await res.text()).toBe('workerd');
});
