import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('embed', () => {
	test('serves embedded components in page', async ({ page, javaScriptEnabled }) => {
		await page.goto('/embed');

		if (javaScriptEnabled) {
			await expect(page.getByTestId('a')).toHaveText('a (browser)');
			await expect(page.getByTestId('b')).toHaveText('b (browser)');
		} else {
			await expect(page.locator('[data-testid="a"]')).toHaveText('a (server)');
			await expect(page.locator('[data-testid="b"]')).toHaveText('b (server)');
		}
	});
});
