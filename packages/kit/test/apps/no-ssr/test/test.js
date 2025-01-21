import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('navigating to a non-existent route renders the default error page', async ({ page }) => {
	test.setTimeout(3000);
	await page.goto('/non-existent-route');
	await page.waitForLoadState('networkidle');
	expect(await page.textContent('h1')).toBe('404');
});
