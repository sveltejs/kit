import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test, is_dev) {
	test('amp is true', '/valid', async ({ page }) => {
		assert.equal(
			await page.innerHTML('h1'),
			`Hello from the server in ${is_dev ? 'dev' : 'prod'} mode!`
		);

		assert.equal(await page.innerHTML('h2'), 'The answer is 42');
		assert.equal(await page.innerHTML('p'), 'amp is true');

		const script = await page.$('script[type="svelte-data"]');
		assert.ok(!script, 'Should not include serialized data');
	});
}
