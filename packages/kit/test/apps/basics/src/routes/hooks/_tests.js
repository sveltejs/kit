import * as assert from 'uvu/assert';

/**
 * A suite of tests that checks that exceptions in hooks are treated correctly
 * @type {import('test').TestMaker}
 */
export default function (test) {
	test(
		'custom error page is rendered if handle hook throws an error',
		'/hooks/test-errorhandling',
		async ({ js, page, base }) => {
			if (js) {
				assert.equal(page.url(), `${base}/hooks/errorpage`);
				assert.equal(await page.textContent('#error-message'), 'This is custom a errorpage');
			}
		}
	);
}
