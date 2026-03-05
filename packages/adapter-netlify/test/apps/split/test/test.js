import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('routes to routes with dynamic params', async ({ page }) => {
	await page.goto('/dynamic/123');
	await expect(page.locator('p')).toHaveText('id: 123');
});

test('client-side navigation fetches server load function data', async ({ page }) => {
	await page.goto('/dynamic');
	await page.click('a');
	await expect(page.locator('p')).toHaveText('id: 1');
});

test('falls back to catch all function if no routes match', async ({ page }) => {
	await page.goto('/non-existent');
	await expect(page.locator('p')).toHaveText('Custom default error page');
});

test('client-side fetch for query remote function data', async ({ page }) => {
	await page.goto('/remote/query');
	await expect(page.locator('p')).toHaveText('a: 1');
});

test('split generates multiple function files', () => {
	const functions_dir = path.resolve(import.meta.dirname, '../.netlify/v1/functions');
	const files = fs.readdirSync(functions_dir).filter((f) => f.startsWith('sveltekit-'));
	expect(files.length).toBeGreaterThan(1);
});

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, '../build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});
