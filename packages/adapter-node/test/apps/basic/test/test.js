import { expect, test } from '@playwright/test';

test('SSR-ed page', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello world!');
});
