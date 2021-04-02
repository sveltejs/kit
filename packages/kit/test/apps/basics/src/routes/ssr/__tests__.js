import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('does not SSR page with ssr=false', '/ssr', async ({ page, js }) => {
		if (js) {
			assert.equal(await page.textContent('h1'), 'content was rendered');
		} else {
			assert.ok(await page.evaluate(() => !document.querySelector('h1')));
			assert.ok(await page.evaluate(() => !document.querySelector('style[data-svelte]')));
			assert.ok(await page.evaluate(() => !document.querySelector('link[rel=stylesheet]')));
		}
	});
}
