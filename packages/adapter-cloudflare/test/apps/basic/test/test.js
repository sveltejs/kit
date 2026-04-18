import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('worker', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('ctx', async ({ request }) => {
	const res = await request.get('/ctx');
	expect(await res.text()).toBe('ctx works');
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

// TODO: test param matchers in dev-only

// TODO: test prerendering a page that imports from cloudflare:workers works after build

// TODO: test prerender remote function after build

// TODO: test paths.assets works after build in preview

// TODO: test service worker still works after build
