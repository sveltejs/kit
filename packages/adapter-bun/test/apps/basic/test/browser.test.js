import { expect, test } from '@playwright/test';

test('renders on the server and hydrates in the browser', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('h1')).toHaveText('Hello from Bun!');
	await expect(page.getByRole('button')).toHaveText('Toggle: false');
	await page.getByRole('button').click();
	await expect(page.getByRole('button')).toHaveText('Toggle: true');
});
