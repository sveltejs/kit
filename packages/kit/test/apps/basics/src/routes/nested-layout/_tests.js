import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('renders a nested layout', '/nested-layout', async ({ page }) => {
		assert.equal(await page.textContent('footer'), 'Custom layout');
		assert.equal(await page.textContent('p'), 'This is a nested layout component');
		assert.equal(await page.textContent('h1'), 'Hello from inside the nested layout component');
	});

	test('renders errors in the right layout', '/nested-layout/error', async ({ page }) => {
		assert.equal(await page.textContent('footer'), 'Custom layout');
		assert.ok(await page.evaluate(() => !document.querySelector('p#nested')));
		assert.equal(
			await page.textContent('#message'),
			'This is your custom error page saying: "Error"'
		);
		assert.equal(await page.textContent('h1'), '500');
	});

	test(
		'renders errors in the right layout after client navigation',
		'/nested-layout/',
		async ({ page, clicknav }) => {
			await clicknav('[href="/nested-layout/error"]');
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.ok(await page.evaluate(() => !document.querySelector('p#nested')));
			assert.equal(
				await page.textContent('#message'),
				'This is your custom error page saying: "Error"'
			);
			assert.equal(await page.textContent('h1'), '500');
		}
	);

	test(
		'renders deeply-nested errors in the right layout',
		'/nested-layout/foo/bar/nope',
		async ({ page }) => {
			assert.equal(await page.textContent('footer'), 'Custom layout');
			assert.ok(await page.evaluate(() => document.querySelector('p#nested')));
			assert.ok(await page.evaluate(() => document.querySelector('p#nested-foo')));
			assert.ok(await page.evaluate(() => document.querySelector('p#nested-bar')));
			assert.equal(await page.textContent('#nested-error-message'), 'error.message: nope');
		}
	);
}
