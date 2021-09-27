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
		async ({ page, js }) => {
			if (js) {
				const input = await page.$('#input');
				assert.ok(input && input.isVisible);
				assert.ok(await page.$eval('#input', (el) => el === document.activeElement));
			}
		}
	);

	test(
		'app-supplied scroll and focus work on navigation to page',
		'/use-action',
		async ({ page, clicknav, js }) => {
			await clicknav('[href="/use-action/focus-and-scroll"]');
			if (js) {
				const input = await page.$('#input');
				assert.ok(input && input.isVisible);
				assert.ok(await page.$eval('#input', (el) => el === document.activeElement));
			}
		}
	);
}
