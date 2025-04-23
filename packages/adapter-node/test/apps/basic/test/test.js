import { expect, test } from '@playwright/test';

test('WebSockets work', async ({ page }) => {
	await page.goto('/ws');
	await expect(page.locator('p')).toContainText('connected');
});

test('WebSockets getPeers helper', async ({ page }) => {
  await page.goto('/ws/helpers');
  await expect(page.getByText('connected')).toBeVisible();
  await page.locator('button', { hasText: 'message all peers' }).click();
  await expect(page.getByText('sent to each peer')).toBeVisible();
});

test('WebSockets publish helper', async ({ page }) => {
  await page.goto('/ws/helpers');
  await expect(page.getByText('connected')).toBeVisible();
  await page.locator('button', { hasText: 'create user' }).click();
  await expect(page.getByText('created a new user')).toBeVisible();
});
