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
}
