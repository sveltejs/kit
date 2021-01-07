import * as assert from 'uvu/assert';

export default function (test) {
	test('resets focus', async ({ visit, click, keyboard, evaluate, contains }) => {
		await visit('/accessibility/a');

		await click('[href="/accessibility/b"]');
		assert.ok(await contains('b'));
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'BODY');
		await keyboard.press('Tab');
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await evaluate(() => document.activeElement.textContent), 'a');

		await click('[href="/accessibility/a"]');
		assert.ok(await contains('a'));
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'BODY');
		await keyboard.press('Tab');
		assert.equal(await evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await evaluate(() => document.activeElement.textContent), 'a');
	});

	test('announces client-side navigation', async ({ visit, click, contains, html, js }) => {
		await visit('/accessibility/a');

		const has_live_region = await contains('aria-live');

		if (js) {
			assert.ok(has_live_region);

			// live region should exist, but be empty
			assert.equal(await html('[aria-live]'), '');

			await click('[href="/accessibility/b"]');
			assert.equal(await html('[aria-live]'), 'Navigated to b'); // TODO i18n
		} else {
			assert.ok(!has_live_region);
		}
	});
}
