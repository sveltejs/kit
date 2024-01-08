import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !!javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('Apply rewrites when directly accessing a page', async ({ page }) => {
	await page.goto('/basic/a');
	expect(await page.textContent('h1')).toContain('Successfully rewritten');
});

test('Rewrites to external URL should always 404', async ({ page }) => {
	//A navigation to /external/rewritten should result in a 404
	const response = await page.goto('/external/rewritten', { waitUntil: 'networkidle' });
	expect(response?.status()).toBe(404);
});

test('Returns a 500 response if the rewrite throws an error on the server', async ({ page }) => {
	const response = await page.goto('/error-handling/server-error', { waitUntil: 'networkidle' });
	expect(response?.status()).toBe(500);
});
