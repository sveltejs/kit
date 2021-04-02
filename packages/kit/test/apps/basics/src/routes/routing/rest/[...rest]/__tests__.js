import * as assert from 'uvu/assert';

/** @type {import('../../../../../../../types').TestMaker} */
export default function (test) {
	test('navigates to ...rest', '/routing/rest/abc/xyz', async ({ page, clicknav }) => {
		assert.equal(await page.textContent('h1'), 'abc/xyz');

		await clicknav('[href="/routing/rest/xyz/abc/def/ghi"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc/def/ghi');
		assert.equal(await page.textContent('h2'), 'xyz/abc/def/ghi');

		await clicknav('[href="/routing/rest/xyz/abc/def"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc/def');
		assert.equal(await page.textContent('h2'), 'xyz/abc/def');

		await clicknav('[href="/routing/rest/xyz/abc"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc');
		assert.equal(await page.textContent('h2'), 'xyz/abc');

		await clicknav('[href="/routing/rest"]');
		assert.equal(await page.textContent('h1'), '');
		assert.equal(await page.textContent('h2'), '');

		await clicknav('[href="/routing/rest/xyz/abc/deep"]');
		assert.equal(await page.textContent('h1'), 'xyz/abc');
		assert.equal(await page.textContent('h2'), 'xyz/abc');

		await clicknav('[href="/routing/rest/xyz/abc/qwe/deep.json"]');
		assert.equal(await page.textContent('body'), 'xyz/abc/qwe');
	});
}
