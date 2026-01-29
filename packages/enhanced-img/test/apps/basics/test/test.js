import { expect, test } from '@playwright/test';
import process from 'node:process';
const is_node18 = process.versions.node.startsWith('18.');
test.skip(is_node18, 'enhanced-img requires vite-plugin-svelte@6 which requires node20');
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
