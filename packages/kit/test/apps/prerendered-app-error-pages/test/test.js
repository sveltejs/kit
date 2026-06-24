import process from 'node:process';
import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test('renders error page on nonexistent route', async ({ page }) => {
	await page.goto('/nonexistent', { wait_for_started: false });
	await expect(page.locator('p')).toHaveText('This is your custom error page.');
});

test('does not reload when __data.json returns 404 on static fallback page', async ({
	page,
	javaScriptEnabled
}) => {
	test.skip(!javaScriptEnabled);
	test.skip(!!process.env.DEV);

	// Simulate the adapter-static fallback scenario where the HTML served for an
	// unknown URL doesn't match the route, forcing _hydrate() to fail and call
	// load_root_error_page. That function fetches __data.json, which returns 404 for
	// a nonexistent route. Without the fix, the catch block calls native_navigation
	// unconditionally, causing an infinite reload loop.
	await page.route('**/nonexistent', async (route) => {
		const response = await route.fetch();
		const body = (await response.text()).replace(
			/node_ids: \[(\d+(?:, \d+)*), \d+\]/,
			'node_ids: [$1, 99]'
		);
		await route.fulfill({ response, body });
	});

	let navCount = 0;
	page.on('request', (req) => {
		if (req.isNavigationRequest()) navCount++;
	});

	await page.goto('/nonexistent', { wait_for_started: false });
	await page.waitForTimeout(2000);

	expect(navCount).toBe(1);
	await expect(page.locator('p')).toHaveText('This is your custom error page.');
});
