import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	// this test lives in the AMP app because `basics` has `hostHeader`
	// configured, and `options` has `host` configured
	test('sets host', '/host', async ({ base, page }) => {
		const hostname = new URL(base).host;
		assert.equal(await page.textContent('[data-source="load"]'), hostname);
		assert.equal(await page.textContent('[data-source="store"]'), hostname);
		assert.equal(await page.textContent('[data-source="endpoint"]'), hostname);
	});
}
