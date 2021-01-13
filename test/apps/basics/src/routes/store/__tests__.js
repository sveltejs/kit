import * as assert from 'uvu/assert';

export default function (test) {
	test('page store functions as expected', async ({
		visit,
		evaluate,
		click,
		text,
		wait_for_text,
		js
	}) => {
		await visit('/store');

		assert.equal(await text('h1'), 'Test');
		assert.equal(await text('h2'), 'Calls: 1');

		await click('a[href="/store/result"]');

		await wait_for_text('h1', 'Result');
		await wait_for_text('h2', js ? 'Calls: 1' : 'Calls: 0');

		const oops = await evaluate(() => window.oops);
		assert.ok(!oops, oops);
	});

	test('navigating store contains from and to', async ({ visit, click, text, sleep, js }) => {
		await visit('/store/navigating/a');

		assert.equal(await text('#navigating'), 'not currently navigating');

		if (js) {
			await click('a[href="/store/navigating/b"]');

			assert.equal(
				await text('#navigating'),
				'navigating from /store/navigating/a to /store/navigating/b'
			);

			await sleep(100);
			assert.equal(await text('#navigating'), 'not currently navigating');
		}
	});
}
