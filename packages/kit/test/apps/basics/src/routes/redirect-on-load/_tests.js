import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('redirect-on-load', '/redirect-on-load', async ({ base, page, js }) => {
		if (js) {
			await page.waitForTimeout(50);
			assert.equal(page.url(), `${base}/redirect-on-load/redirected`);
			assert.equal(await page.textContent('h1'), 'Hazaa!');
		} else {
			assert.equal(page.url(), `${base}/redirect-on-load`);
		}
	});
}
