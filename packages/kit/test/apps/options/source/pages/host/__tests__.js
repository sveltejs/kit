import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('sets host', '/host', async ({ page }) => {
		assert.equal(await page.textContent('[data-source="load"]'), 'example.com');
		assert.equal(await page.textContent('[data-source="store"]'), 'example.com');
		assert.equal(await page.textContent('[data-source="endpoint"]'), 'example.com');
	});
}
