import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('redirect', '/redirect', async ({ base, page, js }) => {
		await page.click('[href="/redirect/a"]');

		if (js) await page.waitForTimeout(50);

		assert.equal(await page.url(), `${base}/redirect/b`);
		assert.equal(await page.textContent('h1'), 'b');
	});

	test('prevents redirect loops', '/redirect', async ({ base, page, js }) => {
		await page.click('[href="/redirect/loopy/a"]');

		if (js) {
			await page.waitForTimeout(50);

			assert.equal(await page.url(), `${base}/redirect/loopy/a`);
			assert.equal(await page.textContent('h1'), '500');
			assert.equal(await page.textContent('#message'), 'Redirect loop');
		} else {
			assert.equal(await page.url(), 'chrome-error://chromewebdata/');
		}
	});
}
