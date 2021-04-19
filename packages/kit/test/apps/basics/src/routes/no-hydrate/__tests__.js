import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('does not hydrate page with hydrate=false', '/no-hydrate', async ({ page, js }) => {
		await page.click('button');
		assert.equal(await page.textContent('button'), 'clicks: 0');

		if (js) {
			await Promise.all([page.click('[href="/no-hydrate/other"]'), page.waitForNavigation()]);
			await Promise.all([page.click('[href="/no-hydrate"]'), page.waitForNavigation()]);

			await page.click('button');
			assert.equal(await page.textContent('button'), 'clicks: 1');
		} else {
			// ensure data wasn't inlined
			assert.equal(
				await page.evaluate(() => document.querySelectorAll('script[type="svelte-data"]').length),
				0
			);
		}
	});

	test(
		'does not include modulepreload links if JS is completely disabled',
		'/no-hydrate/no-js',
		async ({ page }) => {
			assert.equal(await page.textContent('h1'), 'look ma no javascript');
			assert.equal(
				await page.evaluate(() => document.querySelectorAll('link[rel="modulepreload"]').length),
				0
			);
		},
		{
			js: false
		}
	);
}
