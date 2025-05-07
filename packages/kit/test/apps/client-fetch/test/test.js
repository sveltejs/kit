import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.describe.configure({ mode: 'parallel' });

test.describe('client-fetch', () => {
	test('should use client handleFetch for client-side load requests', async ({
		page,
		javaScriptEnabled
	}) => {
		await page.goto('/');
		await page.click('.navigate-to-load');

		if (javaScriptEnabled) {
			await expect(page.getByTestId('header')).toHaveText('imtheclient');
		} else {
			await expect(page.getByTestId('header')).toHaveText('empty');
		}
	});

	test('should not use client handleFetch for server-side load requests', async ({ page }) => {
		await page.goto('/load');
		await expect(page.getByTestId('header')).toHaveText('empty');
	});

	test('should use client handleFetch for fetch requests', async ({ page, javaScriptEnabled }) => {
		await page.goto('/fetch');

		if (javaScriptEnabled) {
			await expect(page.getByTestId('header')).toHaveText('imtheclient');
		} else {
			await expect(page.getByTestId('header')).toHaveText('loading');
		}
	});
});
