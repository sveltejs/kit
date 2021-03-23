import * as assert from 'uvu/assert';

export default function (test) {
	test('works with arbitrary extensions', '/', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'Great success!');
	});

	test('works with other arbitrary extensions', '/const', async ({ base, page }) => {
		assert.equal(await page.textContent('h1'), 'Tremendous!');

		await page.goto(`${base}/a`);

		assert.equal(await page.textContent('h1'), 'a');

		await page.goto(`${base}/test-slug`);

		assert.equal(await page.textContent('h1'), 'TEST-SLUG');

		await page.goto(`${base}/unsafe-replacement`);

		assert.equal(await page.textContent('h1'), 'Bazooom!');
	});
}
