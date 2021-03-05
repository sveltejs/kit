import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('redirect', '/redirect', async ({ base, page, js }) => {
		await page.click('[href="/redirect/a"]');

		if (js) await page.waitForTimeout(50);

		assert.equal(await page.url(), `${base}/redirect/b`);
		assert.equal(await page.textContent('h1'), 'b');
	});
}
