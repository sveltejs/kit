import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('resets layout', '/nested-layout/reset', async ({ page }) => {
		assert.ok(await page.evaluate(() => !document.querySelector('footer')));
		assert.ok(await page.evaluate(() => !document.querySelector('p')));
		assert.equal(await page.textContent('h1'), 'Layout reset');
		assert.equal(await page.textContent('h2'), 'Hello');
	});

	test('context script reset', '/nested-layout/reset', async ({ page }) => {
		assert.ok(await page.evaluate(() => !document.querySelector('h3')));
	});
}
