import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('can access origin through page store', null, async ({ base, page }) => {
		if (!is_dev) {
			page.setExtraHTTPHeaders({
				'x-forwarded-host': 'forwarded.com',
				'x-forwarded-proto': 'https'
			});
		}

		await page.goto(`${base}/origin`);
		assert.equal(await page.textContent('h1'), is_dev ? base : 'https://forwarded.com');

		// reset
		page.setExtraHTTPHeaders({});
	});
}
