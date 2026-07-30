import { expect, test } from '@playwright/test';

test('basic page renders', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');
});

test('edge middleware runs reroute before split function', async ({ page }) => {
	await page.goto('/reroute');
	await expect(page.locator('p')).toContainText('/reroute');
	await page.goto('/en/reroute');
	await expect(page.locator('p')).toContainText('/en/reroute');
});
