import * as assert from 'uvu/assert';

/**
 * A suite of tests for router scrolling on page load
 * @type {import('test').TestMaker}
 */
export default function (test) {
	test(
		'collapsed margin on body should keep at same scroll position after go back',
		'/scroll',
		async ({ clicknav, back, wait_for_scroll_record, page, js }) => {
			if (js) {
				await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
				await wait_for_scroll_record();

				const start_page_y_offset = await page.evaluate(() => pageYOffset);

				await clicknav('#number-299');
				await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
				await wait_for_scroll_record();

				await back();

				const end_page_y_offset = await page.evaluate(() => pageYOffset);
				assert.equal(end_page_y_offset, start_page_y_offset);
			}
		}
	);
}
