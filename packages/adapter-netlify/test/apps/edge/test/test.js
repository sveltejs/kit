import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('page renders', async ({ request }) => {
	const response = await request.get('/');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain('Hello from SvelteKit');
});

test('dynamic route works', async ({ request }) => {
	const response = await request.get('/greeting/world');
	expect(response.status()).toBe(200);
	expect(await response.text()).toContain('Hello world');
});

test('dynamic env is available in instrumentation', async ({ request }) => {
	const response = await request.get('/instrumentation-env');
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ loaded: true });
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('page renders on the client if SSR is turned off', async ({ page }) => {
	await page.goto('/treeshake-server');
	await expect(page.locator('p')).toHaveText('this should never appear in the server bundle');
});

test('bare Node built-in imports work', async ({ request }) => {
	const response = await request.get('/node-builtin');
	expect(await response.text()).toBe(
		'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
	);
});

test('.wasm imports work', async ({ request }) => {
	const response = await request.get('/wasm');
	expect(await response.text()).toBe('3');
});
