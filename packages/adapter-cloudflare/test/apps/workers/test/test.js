import { expect, test } from '@playwright/test';

test('worker works', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Sum: 3');
});

test('WebSockets work', async ({ page }) => {
	await page.goto('/ws');
	await expect(page.locator('p')).toContainText('connected');
});
