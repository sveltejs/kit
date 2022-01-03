import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('serves /', '/path-base/', async ({ page, js }) => {
		assert.equal(await page.textContent('h1'), 'I am in the template');
		assert.equal(await page.textContent('h2'), "We're on index.svelte");
		assert.equal(
			await page.textContent('p'),
			`Hello from the ${js ? 'client' : 'server'} in ${is_dev ? 'dev' : 'prod'} mode!`
		);
	});

	test(
		'does not register service worker if none created',
		'/path-base/',
		async ({ page }) => {
			assert.not.match(await page.content(), /navigator\.serviceWorker/);
		},
		{ dev: false, js: false }
	);

	test('inlines CSS', '/path-base/', async ({ page }) => {
		assert.equal(await page.evaluate(() => document.querySelector('link[rel="stylesheet"]')), null);
	});
}
