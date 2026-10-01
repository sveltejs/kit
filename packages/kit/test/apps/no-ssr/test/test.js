import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('navigating to a non-existent route renders the default error page', async ({ page }) => {
	await page.goto('/non-existent-route');
	expect(await page.textContent('h1')).toBe('404');
});

test('navigating to a non-existent route redirects if redirect in the root layout', async ({
	page
}) => {
	await page.goto('/redirect');
	expect(await page.textContent('h1')).toBe('home');
});

test('universal pages/layouts are not executed on the server', async ({ page }) => {
	await page.goto('/browser-globals');
	await expect(page.locator('p')).toHaveText('pathname: /browser-globals');
});

test('refetches route-dependent server data after an error page', async ({ page, app }) => {
	await page.goto('/');
	await expect(page.locator('#server-route-id')).toHaveText('/');

	let failed = false;
	await page.route('**/__data.json*', (route) => {
		if (failed) return route.continue();
		failed = true;
		return route.fulfill({ status: 500, body: 'nope' });
	});

	await app.goto('/a');
	expect(await page.textContent('h1')).toBe('500');

	await page.unroute('**/__data.json*');

	await app.goto('/b');
	await expect(page.locator('#server-route-id')).toHaveText('/b');
});

test('displays error.html when root layout load() throws in SPA mode', async ({ page }) => {
	await page.goto('/root-layout-error', { wait_for_started: false });
	await expect(page.locator('#error-status')).toHaveText('500');
	await expect(page.locator('#error-message')).toHaveText('Root layout load failed');
	expect(page.url()).toContain('/root-layout-error');
});
