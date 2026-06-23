import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test('renders error page on nonexistent route', async ({ page }) => {
	await page.goto('/nonexistent', { wait_for_started: false });
	expect(await page.textContent('p')).toBe('This is your custom error page.');
});

test('renders error page after client-side navigation to nonexistent route', async ({
	page,
	app,
	javaScriptEnabled
}) => {
	test.skip(!javaScriptEnabled);
	await page.goto('/');
	await Promise.all([page.waitForURL('/nonexistent'), app.goto('/nonexistent').catch(() => {})]);
	expect(await page.textContent('p')).toBe('This is your custom error page.');
});
