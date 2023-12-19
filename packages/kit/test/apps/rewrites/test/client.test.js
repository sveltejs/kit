import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test.skip(({ javaScriptEnabled }) => !!javaScriptEnabled);

test.describe('Rewrites', () => {
	test('rewrites url during client navigation', async ({ page, clicknav }) => {
		await page.goto('/rewrites');
		await clicknav("a[href='/rewrites/from']");
		await expect(page.locator('h1')).toHaveText('Successfully rewritten');
	});
});

test.describe('resolveDestination', () => {
	test('a tags should be rewritten', async ({ page, clicknav }) => {
		await page.goto('/resolveDestination/a');
		await clicknav("a:has-text('Follow me')");
		await expect(page.locator('h1')).toHaveText('Successfully Resolved');
	});

	test('redirects in load functions should be rewritten', async ({ page }) => {
		await page.goto('/resolveDestination/redirect');
		await expect(page.locator('h1')).toHaveText('Successfully Resolved');
	});

	test('redirects in handle hooks should be rewritten', async ({ page }) => {
		await page.goto('/resolveDestination/handle');
		await expect(page.locator('h1')).toHaveText('Successfully Resolved');
	});

	test('redirects in actions should be rewritten', async ({ page }) => {
		await page.goto('/resolveDestination/redirect-in-action');

		//Submit the form
		await page.locator('button').click();

		await expect(page.locator('h1')).toHaveText('Successfully Resolved');
	});

	test('resolves form actions correctly', async ({ page }) => {
		await page.goto('/resolveDestination/form');
		await page.locator('button').click();

		await expect(page.locator('h1')).toHaveText('Successfully Resolved');
	});
});


test.describe("chained", () => { 
	test("client side navigation applies resolveDestination and rewrites", async ({ page, clicknav }) => {
		await page.goto('/chained');
		await clicknav("a");

		await expect(page.locator('h1')).toHaveText('Successfully Chained');
	});
})
