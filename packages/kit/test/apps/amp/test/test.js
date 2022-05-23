import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test('renders an AMP page', async ({ page, baseURL }) => {
	await page.goto(`${baseURL}/valid`);

	await expect(page.locator('h1')).toHaveText(
		`Hello from the server in ${process.env.DEV ? 'dev' : 'prod'} mode!`
	);

	await expect(page.locator('h2')).toHaveText('The answer is 42');

	// should not include serialized data
	expect(await page.$('script[sveltekit\\:data-type="data"]')).toBeNull();
});

test('styles are applied', async ({ page, baseURL }) => {
	await page.goto(`${baseURL}/valid`);

	expect(
		await page.evaluate(() => {
			const el = document.querySelector('p');
			return el && getComputedStyle(el).color;
		})
	).toEqual('rgb(255, 0, 0)');

	expect(
		await page.evaluate(() => {
			const el = document.querySelector('footer');
			return el && getComputedStyle(el).color;
		})
	).toEqual('rgb(128, 0, 128)');
});

test('sets origin', async ({ baseURL, page }) => {
	const { origin } = new URL(/** @type {string} */ (baseURL));

	await page.goto(`${baseURL}/origin`);

	await expect(page.locator('[data-source="load"]')).toHaveText(origin);
	await expect(page.locator('[data-source="store"]')).toHaveText(origin);
	await expect(page.locator('[data-source="endpoint"]')).toHaveText(origin);
});

test('only includes CSS for rendered components', async ({ page, baseURL }) => {
	await page.goto(`${baseURL}/styles`);

	const style = await page.innerHTML('style[amp-custom]');

	expect(style).toContain('#ff3e00'); // rendered styles
	expect(style).toContain('uppercase'); // imported styles
	expect(style).not.toContain('#40b3ff'); // unrendered styles
});

test('http-equiv tags are removed', async ({ page }) => {
	await page.goto('/http-equiv/cache-control');

	expect(await page.textContent('h1')).toBe(
		'the cache-control headers should be removed from this page'
	);
	expect(await page.innerHTML('head')).not.toContain('http-equiv="cache-control"');
});

// validation tests are skipped because amphtml-validator doesn't
// play nicely with CI, and is also abominably slow, because
// everything AMP-related is awful
test.skip('prints validation errors', async ({ page, baseURL }) => {
	await page.goto(`${baseURL}/invalid`);

	const body = await page.innerHTML('body');

	expect(body).toContain("Invalid URL protocol 'javascript:' for attribute 'href' in tag 'a'");
});

test.skip('throws error on encountering stylesheet links', async ({ page }) => {
	await page.goto('/invalid/has-stylesheet');

	expect(await page.textContent('body')).toContain(
		'An AMP document cannot contain <link rel="stylesheet"> — ensure that inlineStyleThreshold is set to Infinity, and remove links from your page template and <svelte:head> elements'
	);
});
