import * as assert from 'uvu/assert';

export default function (test) {
	// TODO unskip this
	test.skip('resets focus', '/accessibility/a', async ({ page, contains }) => {
		await page.click('[href="/accessibility/b"]');
		await page.waitForTimeout(50);
		assert.ok(await contains('b'));
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'BODY');
		await page.keyboard.press('Tab');
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await page.evaluate(() => document.activeElement.textContent), 'a');

		await page.click('[href="/accessibility/a"]');
		await page.waitForTimeout(50);
		assert.ok(await contains('a'));
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'BODY');
		await page.keyboard.press('Tab');
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await page.evaluate(() => document.activeElement.textContent), 'a');
	});

	test('announces client-side navigation', '/accessibility/a', async ({ page, contains, js }) => {
		const has_live_region = await contains('aria-live');

		if (js) {
			assert.ok(has_live_region);

			// live region should exist, but be empty
			assert.equal(await page.innerHTML('[aria-live]'), '');

			await page.click('[href="/accessibility/b"]');
			await page.waitForTimeout(50);
			assert.equal(await page.innerHTML('[aria-live]'), 'Navigated to b'); // TODO i18n
		} else {
			assert.ok(!has_live_region);
		}
	});
}
