import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('sets origin', '/path-base/origin/', async ({ base, page }) => {
		const origin = is_dev ? base : 'https://example.com';

		assert.equal(await page.textContent('[data-source="load"]'), origin);
		assert.equal(await page.textContent('[data-source="store"]'), origin);
		assert.equal(await page.textContent('[data-source="endpoint"]'), origin);
	});
}
