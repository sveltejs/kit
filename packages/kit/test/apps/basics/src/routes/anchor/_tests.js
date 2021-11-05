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
		async ({ is_intersecting_viewport, js }) => {
			if (js) {
				assert.ok(is_intersecting_viewport('#go-to-element'));
			}
		}
	);

	test(
		'url-supplied anchor works on navigation to page',
		'/anchor',
		async ({ clicknav, is_intersecting_viewport, js }) => {
			await clicknav('#first-anchor');
			if (js) {
				assert.ok(is_intersecting_viewport('#go-to-element'));
			}
		}
	);

	test(
		'url-supplied anchor works when navigated from scrolled page',
		'/anchor',
		async ({ clicknav, is_intersecting_viewport, js }) => {
			await clicknav('#second-anchor');
			if (js) {
				assert.ok(is_intersecting_viewport('#go-to-element'));
			}
		}
	);
}
