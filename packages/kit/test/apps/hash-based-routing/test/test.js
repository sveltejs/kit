import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('hash based navigation', () => {
	test('navigation works', async ({ page }) => {
		await page.goto('/');
		expect(await page.textContent('p')).toBe('home');

		await page.locator('a[href="/a"]').click();
		expect(await page.textContent('p')).toBe('a');
		let url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/a');

		await page.locator('button').click();
		expect(await page.textContent('p')).toBe('b');
		url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/b');

		await page.locator('a[href="/a#b"]').click();
		expect(await page.textContent('p')).toBe('a');
		url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/a#b');
	});

	test('navigates to correct page on load', async ({ page }) => {
		await page.goto('/#/a');
		expect(await page.textContent('p')).toBe('a');
	});
});
