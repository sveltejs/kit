import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('reset selection', '/selection/a', async ({ page, clicknav }) => {
		assert.equal(
			await page.evaluate(() => {
				const range = document.createRange();
				range.selectNodeContents(document.body);
				const selection = getSelection();
				if (selection) {
					selection.removeAllRanges();
					selection.addRange(range);
					return selection.rangeCount;
				}
				return 0;
			}),
			1
		);
		await clicknav('[href="/selection/b"]');
		assert.equal(
			await page.evaluate(() => {
				const selection = getSelection();
				if (selection) {
					return selection.rangeCount;
				}
				return 1;
			}),
			0
		);
	});
}
