import * as assert from 'uvu/assert';

export default function (test) {
	test.only('applies imported styles', async ({ visit, evaluate }) => {
		await visit('/css');

		assert.equal(
			await evaluate(() => getComputedStyle(document.querySelector('.styled')).color),
			'rgb(255, 0, 0)'
		);
	});
}
