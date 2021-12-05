import * as assert from 'uvu/assert';

/**
 * A suite of tests for router scrolling on page load
 * @type {import('test').TestMaker}
 */
export default function (test) {
	test(
		'collapsed margin on body should keep at same scroll position after go back',
		'/scroll',
		async ({ clicknav, is_intersecting_viewport, page, js }) => {
			if (js) {
				await clicknav('#number-250');
				await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
				await page.goBack();
				assert.ok(await is_intersecting_viewport('#number-250'));
			}
		}
	);
}
