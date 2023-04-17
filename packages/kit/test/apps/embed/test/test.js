import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('embed', () => {
	test('serves embedded components in page', async ({ page, javaScriptEnabled }) => {
		await page.goto('/embed');

		if (javaScriptEnabled) {
			expect(await page.textContent('[data-testid="a"]')).toBe('a (browser)');
			expect(await page.textContent('[data-testid="b"]')).toBe('b (browser)');
		} else {
			expect(await page.textContent('[data-testid="a"]')).toBe('a (server)');
			expect(await page.textContent('[data-testid="b"]')).toBe('b (server)');
		}
	});
});
