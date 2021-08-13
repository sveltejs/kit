import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('works with arbitrary extensions', '/path-base/custom-extensions/', async ({ page }) => {
		assert.equal(await page.textContent('h2'), 'Great success!');
	});

	test(
		'works with other arbitrary extensions',
		'/path-base/custom-extensions/const',
		async ({ base, page }) => {
			assert.equal(await page.textContent('h2'), 'Tremendous!');

			await page.goto(`${base}/path-base/custom-extensions/a`);

			assert.equal(await page.textContent('h2'), 'a');

			await page.goto(`${base}/path-base/custom-extensions/test-slug`);

			assert.equal(await page.textContent('h2'), 'TEST-SLUG');

			await page.goto(`${base}/path-base/custom-extensions/unsafe-replacement`);

			assert.equal(await page.textContent('h2'), 'Bazooom!');
		}
	);
}
