import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('adds trailing slash', '/path-base/slash', async ({ base, page, clicknav }) => {
		assert.equal(page.url(), `${base}/path-base/slash/`);
		assert.equal(await page.textContent('h2'), '/slash/');

		await clicknav('[href="/path-base/slash/child"]');
		assert.equal(page.url(), `${base}/path-base/slash/child/`);
		assert.equal(await page.textContent('h2'), '/slash/child/');
	});
}
