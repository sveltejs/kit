import * as assert from 'uvu/assert';

export default function (test) {
	// TODO unskip this
	test.skip('resets focus', async ({ visit, click, sleep, keyboard, evaluate, contains }) => {
		await visit('/accessibility/a');

		await click('[href="/accessibility/b"]');
		await sleep(50);
		assert.ok(await contains('b'));
		await sleep(50);
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'BODY');
		await keyboard.press('Tab');
		await sleep(50);
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await evaluate(() => document.activeElement.textContent), 'a');

		await click('[href="/accessibility/a"]');
		await sleep(50);
		assert.ok(await contains('a'));
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'BODY');
		await keyboard.press('Tab');
		await sleep(50);
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await evaluate(() => document.activeElement.textContent), 'a');
	});

	test('announces client-side navigation', async ({ visit, click, contains, html, sleep, js }) => {
		await visit('/accessibility/a');

		const has_live_region = await contains('aria-live');

		if (js) {
			assert.ok(has_live_region);

			// live region should exist, but be empty
			assert.equal(await html('[aria-live]'), '');

			await click('[href="/accessibility/b"]');
			await sleep(50);
			assert.equal(await html('[aria-live]'), 'Navigated to b'); // TODO i18n
		} else {
			assert.ok(!has_live_region);
		}
	});
}
