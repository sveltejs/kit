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

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test('_headers are copied to publish directory', () => {
	const headers = fs.readFileSync(path.resolve(import.meta.dirname, '../build/_headers'), 'utf-8');
	expect(headers).toContain('X-Custom-Header: test-value');
});

test('treeshakes component from the server bundle if SSR is turned off', async ({ page }) => {
	await page.goto('/treeshake-server');
	const component_text = 'this should never appear in the server bundle';
	const server_bundle = fs.readFileSync(
		path.resolve(import.meta.dirname, '../.netlify/v1/edge-functions/sveltekit-render.js'),
		'utf-8'
	);
	expect(server_bundle).not.toContain(component_text);
	await expect(page.locator('p')).toHaveText(component_text);
});
