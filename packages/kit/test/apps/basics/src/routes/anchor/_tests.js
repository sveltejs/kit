import * as assert from 'uvu/assert';

/**
 * A suite of tests that checks that SvelteKit URL anchor is respected and the
 * element with the anchor ID is scrolled into view.
 * @type {import('test').TestMaker}
 */
export default function (test) {
	test(
		'url-supplied anchor works on direct page load',
		'/anchor/anchor#go-to-element',
		async ({ page, js }) => {
			if (js) {
				const p = await page.$('#go-to-element');
				assert.ok(p && (await p.isVisible()));
			}
		}
	);

	test(
		'url-supplied anchor works on navigation to page',
		'/anchor',
		async ({ page, clicknav, js }) => {
			await clicknav('[href="/anchor/anchor#go-to-element"]');
			if (js) {
				const p = await page.$('#go-to-element');
				assert.ok(p && (await p.isVisible()));
			}
		}
	);
}
