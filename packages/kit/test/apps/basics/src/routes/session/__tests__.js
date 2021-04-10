import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('session is available', '/session/', async ({ page, js }) => {
		assert.equal(await page.innerHTML('h1'), 'answer via props: 42');
		assert.equal(await page.innerHTML('h2'), 'answer via store: 42');

		if (js) {
			await page.click('button');
			await page.waitForTimeout(10);
			assert.equal(await page.innerHTML('h1'), 'answer via props: 43');
			assert.equal(await page.innerHTML('h2'), 'answer via store: 43');
		}
	});
}
