import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('disables router if router=false', '/no-router/a', async ({ page, clicknav, js }) => {
		if (js) {
			await page.click('button');
			await page.waitForTimeout(50);
			assert.equal(await page.textContent('button'), 'clicks: 1');

			await Promise.all([page.click('[href="/no-router/b"]'), page.waitForNavigation()]);
			assert.equal(await page.textContent('button'), 'clicks: 0');

			await page.click('button');
			await page.waitForTimeout(50);
			assert.equal(await page.textContent('button'), 'clicks: 1');

			await clicknav('[href="/no-router/a"]');
			assert.equal(await page.textContent('button'), 'clicks: 1');

			await Promise.all([page.click('[href="/no-router/b"]'), page.waitForNavigation()]);
			assert.equal(await page.textContent('button'), 'clicks: 0');
		}
	});
}
