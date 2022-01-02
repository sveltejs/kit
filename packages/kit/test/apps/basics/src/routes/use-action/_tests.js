import * as assert from 'uvu/assert';

/**
 * A suite of tests that checks that SvelteKit scroll and focus handling don't
 * interfere with the scroll and focus handling provided by the application
 * @type {import('test').TestMaker}
 */
export default function (test) {
	test(
		'app-supplied scroll and focus work on direct page load',
		'/use-action/focus-and-scroll',
		async ({ page, is_intersecting_viewport, js }) => {
			if (js) {
				assert.ok(await is_intersecting_viewport('#input'));
				assert.ok(await page.$eval('#input', (el) => el === document.activeElement));
			}
		}
	);

	test(
		'app-supplied scroll and focus work on navigation to page',
		'/use-action',
		async ({ page, clicknav, is_intersecting_viewport, js }) => {
			await clicknav('[href="/use-action/focus-and-scroll"]');
			if (js) {
				assert.ok(await is_intersecting_viewport('#input'));
				assert.ok(await page.$eval('#input', (el) => el === document.activeElement));
			}
		}
	);
}
