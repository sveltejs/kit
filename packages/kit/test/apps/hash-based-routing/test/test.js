import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('hash based navigation', () => {
	test('server rendering is disabled', async ({ request }) => {
		const response = await request.get('/');
		const text = await response.text();

		expect(text).not.toContain('<p');
	});

	test('navigation works', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('p')).toHaveText('home');

		await page.locator('a[href="/#/a"]').click();
		await expect(page.locator('p')).toHaveText('a');
		let url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/a');

		await page.locator('button[data-goto]').click();
		await expect(page.locator('p')).toHaveText('b');
		url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/b');

		await page.locator('a[href="/#/a#b"]').click();
		await expect(page.locator('p')).toHaveText('a');
		url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/a#b');

		await page.locator('button[data-push]').click();
		await expect(page.locator('p')).toHaveText('a');
		url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/b');

		await page.locator('button[data-replace]').click();
		await expect(page.locator('p')).toHaveText('a');
		url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/a#b');
	});

	test('navigates to correct page on load', async ({ page }) => {
		await page.goto('/#/a');
		await expect(page.locator('p')).toHaveText('a');
	});

	test('navigation works with URL encoded characters', async ({ page }) => {
		await page.goto('/?query=%23abc#/%23test');
		await expect(page.locator('p')).toHaveText('home');
		// hashchange event
		await page.goto('/?query=%23abc#/a%23test');
		await expect(page.locator('p')).toHaveText('a');
	});

	test('route id and params are correct', async ({ page }) => {
		await page.goto('/#/b/123');
		await expect(page.locator('p[data-data]')).toHaveText('{"slug":"123"} /b/[slug] /#/b/123');
		await expect(page.locator('p[data-page]')).toHaveText('{"slug":"123"} /b/[slug] /#/b/123');

		await page.goto('/');
		await page.locator('a[href="/#/b/456"]').click();
		await expect(page.locator('p[data-data]')).toHaveText('{"slug":"456"} /b/[slug] /#/b/456');
		await expect(page.locator('p[data-page]')).toHaveText('{"slug":"456"} /b/[slug] /#/b/456');
	});

	test('reroute works', async ({ page }) => {
		await page.goto('/');

		await page.locator('a[href="/#/reroute-a"]').click();
		await expect(page.locator('p')).toHaveText('rerouted');
		let url = new URL(page.url());
		expect(url.hash).toBe('#/reroute-a');

		await page.goto('/');

		await page.locator('a[href="/#/reroute-b"]').click();
		await expect(page.locator('p')).toHaveText('rerouted');
		url = new URL(page.url());
		expect(url.hash).toBe('#/reroute-b');
	});

	test('relative anchor works', async ({ page }) => {
		await page.goto('/#/anchor');

		await page.locator('a[href="#test"]').click();
		await page.waitForURL('#/anchor#test');
		await expect(page.locator('#test')).toHaveText('#test');
		const url = new URL(page.url());
		expect(url.hash).toBe('#/anchor#test');
	});

	test('navigation history works', async ({ page }) => {
		await page.goto('/');

		await page.locator('a[href="/#/a"]').click();
		await page.waitForURL('/#/a');

		await page.locator('a[href="/#/b"]').click();
		await page.waitForURL('/#/b');

		await page.goBack();
		expect(page.locator('p')).toHaveText('a');

		await page.goForward();
		expect(page.locator('p')).toHaveText('b');
	});

	test('sequential focus navigation point is set correctly', async ({ page, browserName }) => {
		const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
		await page.goto('/#/focus');
		await page.locator('a[href="#/focus/a#p"]').click();
		await page.waitForURL('#/focus/a#p');
		expect(await page.evaluate(() => (document.activeElement || {}).nodeName)).toBe('BODY');
		await page.keyboard.press(tab);
		await expect(page.locator('#button3')).toBeFocused();
		await expect(page.locator('button[id="button3"]')).toBeFocused();
	});

	test('resolve works', async ({ page }) => {
		await page.goto('/#/resolve');
		await page.locator('a', { hasText: 'go to home' }).click();
		await expect(page.locator('p')).toHaveText('home');
		const url = new URL(page.url());
		expect(url.pathname).toBe('/');
		expect(url.hash).toBe('#/');
	});
});
