import { expect, test } from '@playwright/test';

test('images are properly rendered', async ({ page }) => {
	await page.goto('/');

	const birdsImg = page.locator('#birds');
	await expect(birdsImg).toBeVisible();
	await expect(birdsImg).toHaveAttribute('alt', 'birds');

	const logoImg = page.locator('#logo');
	await expect(logoImg).toBeVisible();
	await expect(logoImg).toHaveAttribute('alt', 'Svelte logo');

	const playwrightImg = page.locator('#playwright');
	await expect(playwrightImg).toBeVisible();
	await expect(playwrightImg).toHaveAttribute('alt', 'Playwright logo');
});
