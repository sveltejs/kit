import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

test('amp is true', async ({ page, baseURL }) => {
	await page.goto(`${baseURL}/valid`);

	await expect(page.locator('h1')).toHaveText(
		`Hello from the server in ${process.env.DEV ? 'dev' : 'prod'} mode!`
	);

	await expect(page.locator('h2')).toHaveText('The answer is 42');
	await expect(page.locator('p')).toHaveText('amp is true');

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

test('prints validation errors', async ({ page, baseURL }) => {
	await page.goto(`${baseURL}/invalid`);

	const body = await page.innerHTML('body');

	if (process.env.DEV) {
		const h1 = page.locator('h1');
		await expect(h1).toHaveText('AMP validation failed');

		expect(body).toContain("Invalid URL protocol 'javascript:' for attribute 'href' in tag 'a'");
		expect(body).toContain('&lt;a href="javascript:void(0);"&gt;invalid&lt;/a&gt;');
	} else {
		expect(body).toContain('<a href="javascript:void(0);">invalid</a>');
	}
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
