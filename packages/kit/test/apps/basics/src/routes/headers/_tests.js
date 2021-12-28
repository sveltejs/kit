import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('disables floc by default', '/headers', async ({ response }) => {
		const headers = response.headers();
		assert.equal(headers['permissions-policy'], 'interest-cohort=()');
	});

	test(
		'allows headers to be sent as a Headers class instead of a POJO',
		'/headers/class',
		async ({ page }) => {
			assert.equal(await page.innerHTML('p'), 'bar');
		}
	);
}
