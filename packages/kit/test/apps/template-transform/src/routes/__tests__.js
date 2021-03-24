import * as assert from 'uvu/assert';

/** @type {import('../../../../types').TestMaker} */
export default function (test) {
	test('Should apply dark class to html element', '/', async ({ page }) => {
		assert.equal(await page.evaluate(() => document.documentElement.className), 'dark');
	});
}
