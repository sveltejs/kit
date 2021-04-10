import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('calls a delete handler', '/delete-route/', async ({ page, js }) => {
		if (js) {
			await page.click('.del');
			assert.equal(await page.innerHTML('h1'), 'deleted 42');
		}
	});
}
