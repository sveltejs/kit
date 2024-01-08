import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !!javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test("Apply rewrites when directly accessing a page", async ({ page, context }) => {
	await page.goto("/basic/a")
	expect(await page.textContent("h1")).toContain("Successfully rewritten");
});