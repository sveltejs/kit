import * as assert from 'uvu/assert';

/** @type {import('test').TestMaker} */
export default function (test, is_dev) {
	test('baspath is loaded', '/basePath/valid', async ({ page }) => {
		assert.equal(
			await page.innerHTML('h1'),
			`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`
		);
	});
}
