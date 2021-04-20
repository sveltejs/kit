import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('loads styles', '/', async ({ page, clicknav }) => {
		await clicknav('[href="/css"]');

		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector('h3')).color),
			'rgb(255, 0, 0)'
		);
	});
}
