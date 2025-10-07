import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test('afterNavigate runs after hydration', async ({ page }) => {
	await page.goto('/after_navigate');

	expect(await page.innerText('pre')).toBe('1');
});
