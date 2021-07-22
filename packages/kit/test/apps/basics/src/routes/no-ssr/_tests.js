import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('does not SSR page with ssr=false', '/no-ssr', async ({ page, js }) => {
		if (js) {
			assert.equal(await page.textContent('h1'), 'content was rendered');
		} else {
			assert.ok(await page.evaluate(() => !document.querySelector('h1')));
			assert.ok(await page.evaluate(() => !document.querySelector('style[data-svelte]')));
		}
	});

	test(
		'applies generated component styles with ssr=false (hides announcer)',
		'/no-ssr',
		async ({ page, clicknav, js }) => {
			if (js) {
				await clicknav('[href="/no-ssr/other"]');

				assert.equal(
					await page.evaluate(() => {
						const el = document.querySelector('#svelte-announcer');
						return el && getComputedStyle(el).position;
					}),
					'absolute'
				);
			}
		}
	);
}
