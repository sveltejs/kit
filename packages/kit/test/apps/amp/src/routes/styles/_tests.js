import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('only includes CSS for rendered components', '/styles', async ({ page }) => {
		const style = await page.innerHTML('style[amp-custom]');

		console.log(style);

		assert.ok(style.includes('turquoise'), 'Rendered styles are included');
		assert.ok(style.includes('uppercase'), 'Imported styles are included');
		assert.ok(!style.includes('goldenrod'), 'Unrendered styles are omitted');
	});
}
