import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('handles resolve.alias as array', '/alias', async ({ page }) => {
		assert.equal(await page.textContent('p'), 'foo');
	});
}
