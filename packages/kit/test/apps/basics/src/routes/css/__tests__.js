import * as assert from 'uvu/assert';

export default function (test) {
	test('applies imported styles', '/css', async ({ page }) => {
		assert.equal(
			await page.evaluate(() => getComputedStyle(document.querySelector('.styled')).color),
			'rgb(255, 0, 0)'
		);
	});
}
