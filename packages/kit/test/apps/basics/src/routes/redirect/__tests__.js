import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('redirect', '/redirect', async ({ base, page, clicknav }) => {
		await clicknav('[href="/redirect/a"]');

		assert.equal(await page.url(), `${base}/redirect/c`);
		assert.equal(await page.textContent('h1'), 'c');
	});

	test('prevents redirect loops', '/redirect', async ({ base, page, js }) => {
		await page.click('[href="/redirect/loopy/a"]');

		if (js) {
			await page.waitForTimeout(100);
			assert.equal(await page.url(), `${base}/redirect/loopy/a`);
			assert.equal(await page.textContent('h1'), '500');
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Redirect loop"'
			);
		} else {
			// there's not a lot we can do to handle server-side redirect loops
			assert.equal(await page.url(), 'chrome-error://chromewebdata/');
		}
	});

	test('errors on missing status', '/redirect', async ({ base, page, clicknav }) => {
		await clicknav('[href="/redirect/missing-status/a"]');

		assert.equal(await page.url(), `${base}/redirect/missing-status/a`);
		assert.equal(await page.textContent('h1'), '500');
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: ""redirect" property returned from load() must be accompanied by a 3xx status code"'
		);
	});

	test('errors on invalid status', '/redirect', async ({ base, page, clicknav }) => {
		await clicknav('[href="/redirect/missing-status/b"]');

		assert.equal(await page.url(), `${base}/redirect/missing-status/b`);
		assert.equal(await page.textContent('h1'), '500');
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: ""redirect" property returned from load() must be accompanied by a 3xx status code"'
		);
	});
}
