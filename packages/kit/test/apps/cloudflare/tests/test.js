import { expect, test } from '@playwright/test';

test('value from KV is as inserted from server', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('span.value')).toHaveText('value: "bar"');
});
