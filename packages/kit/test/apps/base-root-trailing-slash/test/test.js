import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test.describe.configure({ mode: 'parallel' });

test.describe('trailingSlash: never at the base root', () => {
	test('serves /basepath without redirecting', async ({ request }) => {
		const response = await request.get('/basepath', { maxRedirects: 0 });
		expect(response.status()).toBe(200);
	});

	test('redirects /basepath/ to /basepath', async ({ request }) => {
		const response = await request.get('/basepath/?foo=bar', { maxRedirects: 0 });
		expect(response.status()).toBe(308);
		expect(response.headers()['location']).toBe('../basepath?foo=bar');
	});

	test('loads the root page and its assets from /basepath', async ({ page, javaScriptEnabled }) => {
		/** @type {string[]} */
		const failed = [];
		page.on('response', (response) => {
			if (response.status() >= 400) failed.push(response.url());
		});

		await page.goto('/basepath');

		expect(new URL(page.url()).pathname).toBe('/basepath');
		expect(await page.textContent('h1')).toBe('Root');
		expect(await page.textContent('[data-testid="base"]')).toBe(
			`base: ${javaScriptEnabled ? '/basepath/' : './basepath/'}`
		);
		expect(failed).toEqual([]);
	});

	test('navigates to and from the root without a trailing slash', async ({ page, clicknav }) => {
		await page.goto('/basepath');

		await clicknav('a:has-text("About")');
		expect(new URL(page.url()).pathname).toBe('/basepath/about');

		await clicknav('a:has-text("Root")');
		expect(new URL(page.url()).pathname).toBe('/basepath');
		expect(await page.textContent('h1')).toBe('Root');
	});
});
