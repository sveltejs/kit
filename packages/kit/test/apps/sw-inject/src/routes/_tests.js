import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('serves /', '/', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'Hello');
	});

	test(
		'build /service-worker.js',
		'/',
		async ({ fetch }) => {
			const res = await fetch('/service-worker.js');
			const content = await res.text();

			assert.match(content, /\/_app\/start-[a-z0-9]+\.js/);
		},
		{ dev: false, js: true }
	);

	test(
		'does not register /service-worker.js',
		'/',
		async ({ page }) => {
			assert.not.match(await page.content(), /navigator\.serviceWorker/);
		},
		{ dev: false, js: true }
	);
}
