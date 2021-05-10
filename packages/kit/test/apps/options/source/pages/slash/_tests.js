import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('adds trailing slash', '/slash', async ({ base, page, clicknav }) => {
		assert.equal(page.url(), `${base}/slash/`);
		assert.equal(await page.textContent('h2'), '/slash/');

		await clicknav('[href="/slash/child"]');
		assert.equal(page.url(), `${base}/slash/child/`);
		assert.equal(await page.textContent('h2'), '/slash/child/');
	});
}
