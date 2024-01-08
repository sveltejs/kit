import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('Apply rewrites during client side navigation', async ({ page }) => {
	await page.goto('/basic');
	await page.click("a[href='/basic/a']");
	expect(await page.textContent('h1')).toContain('Successfully rewritten');
});

test('Apply rewrites after client-only redirects', async ({ page }) => {
	await page.goto('/client-only-redirect');
	expect(await page.textContent('h1')).toContain('Successfully rewritten');
});

test('Apply rewrites to preload data', async ({ page }) => {
	await page.goto('/preload-data');
	await page.click('button');
	await page.waitForSelector('pre');
	expect(await page.textContent('pre')).toContain('"success": true');
});

test('Rewrites to external URL should always 404 - After client-side navigation', async ({
	page
}) => {
	await page.goto('/external');
	await page.click("a[href='/external/rewritten']");

	expect(await page.textContent('body')).toContain('Not found');
});

test('rewriteUrl does not get applied to external URLs', async ({ page }) => {
	await page.goto('/external');
	const currentURL = new URL(page.url());

	//click the link with the text External URL
	await page.click("a[data-test='external-url']");

	//The URl should not have the same origin as the current URL
	const newURL = new URL(page.url());
	expect(currentURL.origin).not.toEqual(newURL.origin);
});
