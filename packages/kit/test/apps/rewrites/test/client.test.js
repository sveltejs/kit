import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test("Apply rewrites during client side navigation", async ({ page, context }) => {
	await page.goto("/basic")
	await page.click("a[href='/basic/a']")
	expect(await page.textContent("h1")).toContain("Successfully rewritten");
});

test("Apply rewrites after client-only redirects", async ({ page, context }) => {
	await page.goto("/client-only-redirect")
	expect(await page.textContent("h1")).toContain("Successfully rewritten");
});

test("Apply rewrites to preload data", async ({ page, context }) => {
	await page.goto("/preload-data")

	//Click the button to trigger the preload
	await page.click("button")

	//Wait for a <pre> element to appear
	await page.waitForSelector("pre")

	//Check that the <pre> element contains the expected text
	expect(await page.textContent("pre")).toContain('"success": true');
});