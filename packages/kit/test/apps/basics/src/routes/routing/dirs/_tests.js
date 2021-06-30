import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('test that file ignore works', '/', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'the answer is 42');
	});
}
