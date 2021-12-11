import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('prints validation errors', '/invalid', async ({ page }) => {
		const body = await page.innerHTML('body');
		if (is_dev) {
			assert.equal(await page.textContent('h1'), 'AMP validation failed');

			assert.ok(
				body.includes("Invalid URL protocol 'javascript:' for attribute 'href' in tag 'a'")
			);
			assert.ok(body.includes('&lt;a href="javascript:void(0);"&gt;invalid&lt;/a&gt;'));
		} else {
			assert.ok(body.includes('<a href="javascript:void(0);">invalid</a>'));
		}
	});
}
