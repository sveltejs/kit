import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('amp is true', '/valid', async ({ page }) => {
		assert.equal(
			await page.innerHTML('h1'),
			`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`
		);

		assert.equal(await page.innerHTML('h2'), 'The answer is 42');
		assert.equal(await page.innerHTML('p'), 'amp is true');

		const script = await page.$('script[data-type="svelte-data"]');
		assert.ok(!script, 'Should not include serialized data');
	});

	test('styles are applied', '/valid', async ({ page }) => {
		assert.equal(
			await page.evaluate(() => {
				const el = document.querySelector('p');
				return el && getComputedStyle(el).color;
			}),
			'rgb(255, 0, 0)'
		);

		assert.equal(
			await page.evaluate(() => {
				const el = document.querySelector('footer');
				return el && getComputedStyle(el).color;
			}),
			'rgb(128, 0, 128)'
		);
	});
}
