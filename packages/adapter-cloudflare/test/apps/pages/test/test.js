import { expect, test } from '@playwright/test';

test('worker works', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});
