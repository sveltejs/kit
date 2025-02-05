import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('server-side route resolution with server reroute', () => {
	test('can reroute based on header', async ({ page, context }) => {
		await page.goto('/');
		await expect(page.locator('p')).toHaveText('home');

		context.setExtraHTTPHeaders({ 'x-reroute': 'true' });
		await page.locator('a[href="/somewhere"]').click();
		await expect(page.locator('p')).toHaveText('rerouted-header');
	});

	test('can reroute based on cookie', async ({ page, context }) => {
		await page.goto('/');
		await expect(page.locator('p')).toHaveText('home');

		await context.addCookies([{ name: 'reroute', value: 'true', path: '/', domain: 'localhost' }]);
		await page.locator('a[href="/somewhere"]').click();
		await expect(page.locator('p')).toHaveText('rerouted-cookie');
	});

	test('can reroute based on pathname', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('p')).toHaveText('home');

		await page.locator('a[href="/reroute"]').click();
		await expect(page.locator('p')).toHaveText('rerouted');

		await page.locator('a[href="/not-rerouted"]').click();
		await expect(page.locator('p')).toHaveText('not-rerouted');
	});
});
