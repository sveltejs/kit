import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('adds trailing slash', '/slash', async ({ base, page }) => {
		assert.equal(page.url(), `${base}/slash/`);
		assert.equal(await page.textContent('h2'), '/slash/');
	});
}
