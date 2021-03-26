import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test.only(
		'does not hydrate page with hydrate=false',
		'/hydrate',
		async ({ page, clicknav, js }) => {
			await page.click('button');
			assert.equal(await page.textContent('button'), 'clicks: 0');

			if (js) {
				await clicknav('[href="/hydrate/other"]');
				await clicknav('[href="/hydrate"]');

				await page.click('button');
				assert.equal(await page.textContent('button'), 'clicks: 1');
			}
		}
	);
}
