import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('page with client only code', '/client-code', async ({ page, js }) => {
		if (js) {
			await page.waitForSelector('span');
			assert.equal(await page.textContent('span'), 'App root is div#svelte');
		} else {
			assert.ok(await page.evaluate(() => !document.querySelector('span')));
		}
	});

	test('page with client only dependency', '/client-code/dep', async ({ page, js }) => {
		if (js) {
			await page.waitForSelector('span');
			assert.equal(await page.textContent('span'), 'App root is div#svelte');
		} else {
			assert.ok(await page.evaluate(() => !document.querySelector('span')));
		}
	});
}
