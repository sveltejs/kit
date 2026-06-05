import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { expect, test } from '@playwright/test';

test('worker', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('ctx', async ({ request }) => {
	const res = await request.get('/ctx');
	expect(await res.text()).toBe('ctx works');
});

test('read from $app/server', async ({ request }) => {
	const content = fs.readFileSync(
		path.resolve(import.meta.dirname, '../src/routes/read/file.txt'),
		'utf-8'
	);
	const response = await request.get('/read');
	expect(await response.text()).toBe(content);
});

test.describe('dev only', () => {
	test.skip(!process.env.DEV);

	test('inlines styles during dev to avoid FOUC', async ({ page }) => {
		await page.goto('/inline-style');
		await expect(page.locator('p')).toHaveCSS('color', 'rgb(0, 0, 255)');
	});

	test('resolves param matchers', async ({ page }) => {
		await page.goto('/matchers/apple');
		await expect(page.locator('p')).toHaveText('apple is a fruit');
	});
});
