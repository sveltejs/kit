import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('redirect-on-load', '/redirect-on-load', async ({ base, page, clicknav }) => {
		assert.equal(page.url(), `${base}/redirect-on-load/redirected`);
		assert.equal(await page.textContent('h1'), 'Hazaa!');
	});
}
