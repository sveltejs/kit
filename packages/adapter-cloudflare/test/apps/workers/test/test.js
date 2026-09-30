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

test('cloudflare:workers remains stubbed for vite preview', () => {
	test.skip(!!process.env.DEV);
	const output = fs.readFileSync(
		path.resolve(
			import.meta.dirname,
			'../.svelte-kit/output/server/entries/endpoints/env/_server.js'
		),
		'utf8'
	);
	expect(output).toContain('virtual-cloudflare-workers.js?');
	expect(output).not.toContain('cloudflare:workers');

	const worker = fs.readFileSync(
		path.resolve(
			import.meta.dirname,
			'../.svelte-kit/cloudflare-tmp/server/entries/endpoints/env/_server.js'
		),
		'utf8'
	);
	expect(worker).toContain('cloudflare:workers');
	expect(worker).not.toContain('virtual-cloudflare-workers.js?');
});

test('instrumentation uses the Worker server copy', async ({ request }) => {
	const res = await request.get('/instrumentation');
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
