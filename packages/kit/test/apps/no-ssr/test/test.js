import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

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
