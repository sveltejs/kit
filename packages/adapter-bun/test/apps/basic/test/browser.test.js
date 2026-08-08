import { expect, test } from '@playwright/test';

test('renders on the server and hydrates in the browser', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('h1')).toHaveText('Bun adapter fixture');
	await expect(page.getByRole('button')).toHaveText('Count: 0');
	await page.getByRole('button').click();
	await expect(page.getByRole('button')).toHaveText('Count: 1');
});
