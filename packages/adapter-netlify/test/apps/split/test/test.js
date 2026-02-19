import { expect, test } from '@playwright/test';

test('routes to routes with dynamic params', async ({ page }) => {
	await page.goto('/dynamic/123');
	await expect(page.locator('p')).toHaveText('Hello world!');
});
