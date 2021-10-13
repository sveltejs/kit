import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test) {
	test('escapes inline data', '/xss', async ({ page, js }) => {
		assert.equal(
			await page.textContent('h1'),
			'user.name is </script><script>window.pwned = 1</script>'
		);

		if (!js) {
			// @ts-expect-error - check global injected variable
			assert.ok(!(await page.evaluate(() => window.pnwed)), 'pwned');
		}
	});

	const uri_xss_payload = encodeURIComponent('</script><script>window.pwned=1</script>');
	test('no xss via dynamic route path', `/xss/${uri_xss_payload}`, async ({ page }) => {
		// @ts-expect-error - check global injected variable
		assert.ok(!(await page.evaluate(() => window.pnwed)), 'pwned');
	});

	test('no xss via query param', `/xss/query?key=${uri_xss_payload}`, async ({ page }) => {
		// @ts-expect-error - check global injected variable
		assert.ok(!(await page.evaluate(() => window.pnwed)), 'pwned');
	});
}
