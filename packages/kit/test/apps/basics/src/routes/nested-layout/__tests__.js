import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	test('renders a nested layout', '/nested-layout/', async ({ page }) => {
		assert.equal(await page.textContent('footer'), 'Custom layout');
		assert.equal(await page.textContent('p'), 'This is a nested layout component');
		assert.equal(await page.textContent('h1'), 'Hello from inside the nested layout component');
	});
}
