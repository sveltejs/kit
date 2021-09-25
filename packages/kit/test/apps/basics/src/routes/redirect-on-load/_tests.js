import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('redirect-on-load', '/redirect-on-load', async ({ base, page, js }) => {
		if (js) {
			assert.equal(page.url(), `${base}/redirect-on-load/redirected`);
			assert.equal(await page.textContent('h1'), 'Hazaa!');
		} else {
			assert.equal(page.url(), `${base}/redirect-on-load`);
		}
	});
}
