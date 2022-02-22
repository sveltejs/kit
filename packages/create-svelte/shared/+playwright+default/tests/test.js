import { expect, test } from '@playwright/test';

test('about page has expected h1', async ({ page }) => {
	await page.goto('/about');
	expect(await page.textContent('h1')).toBe('About this app');
});
