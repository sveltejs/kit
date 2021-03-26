import * as assert from 'uvu/assert';

/** @type {import('../../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test.only(
		'disables router if router=false',
		'/routing/disabled/a',
		async ({ page, clicknav, js }) => {
			if (js) {
				await page.click('button');
				assert.equal(await page.textContent('button'), 'clicks: 1');

				await clicknav('[href="/routing/disabled/b"]');
				assert.equal(await page.textContent('button'), 'clicks: 0');

				await page.click('button');
				assert.equal(await page.textContent('button'), 'clicks: 1');

				await clicknav('[href="/routing/disabled/a"]');
				assert.equal(await page.textContent('button'), 'clicks: 1');

				await clicknav('[href="/routing/disabled/b"]');
				assert.equal(await page.textContent('button'), 'clicks: 0');
			}
		}
	);
}
