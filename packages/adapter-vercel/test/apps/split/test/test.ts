import { expect, test } from '@playwright/test';

test('split functions work', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');
	await page.goto('/a');
	await expect(page.locator('p')).toContainText(/split config/);
});
