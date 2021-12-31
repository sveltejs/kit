import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('sets_paths', '/path-base/base/', async ({ page }) => {
		assert.equal(await page.textContent('[data-source="base"]'), '/path-base');
		assert.equal(await page.textContent('[data-source="assets"]'), '/_svelte_kit_assets');
	});

	test('loads javascript', '/path-base/base/', async ({ page, js }) => {
		assert.equal(await page.textContent('button'), 'clicks: 0');

		if (js) {
			await page.click('button');
			assert.equal(await page.textContent('button'), 'clicks: 1');
		}
	});

	test('loads CSS', '/path-base/base/', async ({ page }) => {
		assert.equal(
			await page.evaluate(() => {
				const el = document.querySelector('p');
				return el && getComputedStyle(el).color;
			}),
			'rgb(255, 0, 0)'
		);
	});

	test('sets params correctly', '/path-base/base/one', async ({ page, clicknav }) => {
		assert.equal(await page.textContent('h2'), 'one');

		await clicknav('[href="/path-base/base/two"]');
		assert.equal(await page.textContent('h2'), 'two');
	});
}
