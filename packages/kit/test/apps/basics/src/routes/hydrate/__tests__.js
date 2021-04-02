import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('does not hydrate page with hydrate=false', '/hydrate', async ({ page, js }) => {
		await page.click('button');
		assert.equal(await page.textContent('button'), 'clicks: 0');

		if (js) {
			await Promise.all([page.click('[href="/hydrate/other"]'), page.waitForNavigation()]);
			await Promise.all([page.click('[href="/hydrate"]'), page.waitForNavigation()]);

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
}
