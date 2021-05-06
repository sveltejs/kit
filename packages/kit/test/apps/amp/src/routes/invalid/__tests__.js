import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('prints validation errors', '/invalid', async ({ page }) => {
		const body = await page.innerHTML('body');
		if (is_dev) {
			assert.equal(await page.textContent('h1'), 'AMP validation failed');

			assert.ok(body.includes("The tag 'img' may only appear as a descendant of tag 'noscript'"));
			assert.ok(body.includes('&lt;img alt="A potato." src="potato.jpg"&gt;'));
		} else {
			assert.ok(body.includes('<img alt="A potato." src="potato.jpg">'));
		}
	});
}
