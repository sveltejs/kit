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
}
