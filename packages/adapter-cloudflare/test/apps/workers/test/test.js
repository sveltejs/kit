import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('worker', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('ctx', async ({ request }) => {
	const res = await request.get('/ctx');
	expect(await res.text()).toBe('ctx works');
});

test('read from $app/server works', async ({ request }) => {
	const content = fs.readFileSync(path.resolve(__dirname, '../src/routes/read/file.txt'), 'utf-8');
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});
