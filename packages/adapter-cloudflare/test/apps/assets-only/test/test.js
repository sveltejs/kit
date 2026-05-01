import { expect, test } from '@playwright/test';

test('assets only works', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('p')).toHaveText('hello world!');
});
