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
}
