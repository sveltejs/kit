import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test('query in a layout redirects outside that layout', async ({ page }) => {
	await page.goto('/remote/query-redirect');
	await page.click('a[href="/remote/query-redirect/from-common-layout?outside"]');
	await expect(page).toHaveURL(/\/remote\/query-redirect\/redirected$/);
	await expect(page.locator('#redirected')).toHaveText('redirected');
});
