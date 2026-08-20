import { expect, test } from '@playwright/test';

test('split functions work', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toContainText('Hello from SvelteKit on Vercel');
	await page.goto('/a');
	await expect(page.locator('p')).toContainText(/split config/);
});

test('reroute works', async ({ page }) => {
	await page.goto('/reroute');
	await expect(page.locator('p')).toContainText('/reroute');
	await page.goto('/en/reroute?hello=world');
	await expect(page.locator('p')).toContainText('/en/reroute?hello=world');
});

// TODO: test remote function works

// TODO: test preloadCode works
