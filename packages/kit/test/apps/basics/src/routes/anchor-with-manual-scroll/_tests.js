import * as assert from 'uvu/assert';

/**
 * A suite of tests that checks that SvelteKit URL anchor is ignored when the
 * onMount() lifecycle method contains custom scroll logic.
 * @type {import('test').TestMaker}
 */
export default function (test) {
	test(
		'url-supplied anchor is ignored with onMount() scrolling on direct page load',
		'/anchor-with-manual-scroll/anchor#go-to-element',
		async ({ page, js }) => {
			if (js) {
				const p = await page.$('#abcde');
				assert.ok(p && (await p.isVisible()));
			}
		}
	);

	test(
		'url-supplied anchor is ignored with onMount() scrolling on navigation to page',
		'/anchor-with-manual-scroll',
		async ({ page, clicknav, js }) => {
			await clicknav('[href="/anchor-with-manual-scroll/anchor#go-to-element"]');
			if (js) {
				const p = await page.$('#abcde');
				assert.ok(p && (await p.isVisible()));
			}
		}
	);
}
