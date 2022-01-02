import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('can access origin through page store', null, async ({ base, page }) => {
		await page.goto(`${base}/origin`);
		assert.equal(await page.textContent('h1'), base);
	});
}
