import { expect } from '../../../playwright-matchers.js';
import { test } from '../../../utils.js';

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test('reuses nested layout data and updates it after invalidation', async ({ page, app }) => {
	/** @type {string[]} */
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/render-tree/child');
	await expect(page.locator('#rendered')).toHaveText('root / child');
	await expect(page.locator('#effect-runs')).toHaveText('1');

	// Replacing the child page must not create new data for the surviving layout.
	await app.goto('/render-tree/child/csr');
	await expect(page.locator('h1')).toHaveText('client page');
	await expect(page.locator('#effect-runs')).toHaveText('1');

	await app.invalidate('render-tree:child');
	await expect(page.locator('#effect-runs')).toHaveText('2');
	await expect(page.locator('#rendered')).toHaveText('root / child');

	await app.goto('/render-tree/child/csr?child=updated');
	await expect(page.locator('#rendered')).toHaveText('root / updated');
	await expect(page.locator('#effect-runs')).toHaveText('3');

	await page.goBack();
	await expect(page.locator('#rendered')).toHaveText('root / child');
	await expect(page.locator('#effect-runs')).toHaveText('4');
	expect(errors).toEqual([]);
});
