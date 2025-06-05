import { expect, test } from '@playwright/test';

test('worker works', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test("('$app/server').read works", async ({ page }) => {
	const response = await page.goto('/read');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toBe('image/jpeg');
});
