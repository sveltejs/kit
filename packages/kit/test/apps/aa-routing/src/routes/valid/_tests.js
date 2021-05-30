import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('basepath is loaded', '/basePath/valid', async ({ page }) => {
		assert.equal(await page.innerHTML('h1'), 'Hello!');
	});
}
