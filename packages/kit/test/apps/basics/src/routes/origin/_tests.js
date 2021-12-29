import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('can access origin through url store', null, async ({ base, page }) => {
		await page.goto(`${base}/origin`);
		assert.equal(await page.textContent('h1'), base);
	});
}
