import { expect, test } from '@playwright/test';

test('edge middleware runs reroute before split function', async ({ page }) => {
	await page.goto('/reroute');
	await expect(page.locator('p')).toContainText('/reroute');
	await page.goto('/en/reroute');
	await expect(page.locator('p')).toContainText('/en/reroute');
});
