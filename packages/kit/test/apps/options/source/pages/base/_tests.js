import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('sets_paths', '/base/', async ({ page }) => {
		assert.equal(await page.textContent('[data-source="base"]'), '/path-base');
		assert.equal(await page.textContent('[data-source="assets"]'), '/path-base');
	});
}
