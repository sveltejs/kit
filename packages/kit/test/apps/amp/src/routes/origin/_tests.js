import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	// this test lives in the AMP app because `basics` has `headers.host`
	// configured, and `options` has `host` configured
	test('sets origin amp', '/origin', async ({ base, page }) => {
		const { origin } = new URL(base);
		assert.equal(await page.textContent('[data-source="load"]'), origin);
		assert.equal(await page.textContent('[data-source="store"]'), origin);
		assert.equal(await page.textContent('[data-source="endpoint"]'), origin);
	});
}
