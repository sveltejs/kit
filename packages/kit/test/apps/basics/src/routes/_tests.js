import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('fetch in root index.svelte works', '/', async ({ page }) => {
		assert.equal(await page.textContent('h1'), 'the answer is 42');
	});
	test('prerender encoding data uri', '/', async ({ page }) => {
		assert.equal(
			await page.getAttribute('link', 'href'),
			'data:image/svg+xml,\
<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22>\
<text y=%22.9em%22 font-size=%2290%22>\
💥</text></svg>'
		);
	});
}
