import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('keepfocus works', '/keepfocus', async ({ page, js }) => {
		if (js) {
			await page.type('#input', 'bar');
			assert.ok(page.url().includes('?foo=bar'));
			assert.ok(await page.$eval('#input', (el) => el === document.activeElement));
		}
	});
}
