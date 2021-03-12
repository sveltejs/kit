import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('calls a delete handler', '/delete-route', async ({ page, js }) => {
		if (js) {
			await Promise.all([page.waitForNavigation(), page.click('.del')]);
			await page.waitForSelector('h1');

			assert.equal(await page.innerHTML('h1'), 'deleted 42');
		}
	});
}
