import * as assert from 'uvu/assert';

export default function (test) {
	test('page store functions as expected', async ({ visit, evaluate, click, text, wait_for_text, js }) => {
		await visit('/store/');

		assert.equal(await text('h1'), 'Test');
		assert.equal(await text('h2'), 'Called 1 time');

		await click('a[href="result"]');

		await wait_for_text('h1', 'Result');
		await wait_for_text('h2', 'Called 1 time');

		const oops = await evaluate(() => window.oops);
		assert.ok(!oops, oops);
	});
}
