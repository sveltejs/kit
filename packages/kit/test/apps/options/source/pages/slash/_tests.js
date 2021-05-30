import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('adds trailing slash', '/base-path/slash', async ({ base, page, clicknav }) => {
		assert.equal(page.url(), `${base}/base-path/slash/`);
		assert.equal(await page.textContent('h2'), '/base-path/slash/');

		await clicknav('[href="/slash/child"]');
		assert.equal(page.url(), `${base}/base-path/slash/child/`);
		assert.equal(await page.textContent('h2'), '/base-path/slash/child/');
	});
}
