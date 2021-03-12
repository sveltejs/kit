import * as assert from 'uvu/assert';

/** @type {import('../../../../../types').TestMaker} */
export default function (test) {
	// TODO unskip this
	test.skip('resets focus', '/accessibility/a', async ({ page }) => {
		await Promise.all([page.waitForNavigation(), page.click('[href="/accessibility/b"]')]);
		await page.waitForTimeout(50);
		assert.equal(await page.innerHTML('h1'), 'b');
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'BODY');
		await page.keyboard.press('Tab');
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await page.evaluate(() => document.activeElement.textContent), 'a');

		await Promise.all([page.waitForNavigation(), page.click('[href="/accessibility/a"]')]);
		await page.waitForTimeout(50);
		assert.equal(await page.innerHTML('h1'), 'a');
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'BODY');
		await page.keyboard.press('Tab');
		await page.waitForTimeout(50);
		assert.equal(await page.evaluate(() => document.activeElement.nodeName), 'A');
		assert.equal(await page.evaluate(() => document.activeElement.textContent), 'a');
	});

	test('announces client-side navigation', '/accessibility/a', async ({ page, js }) => {
		const has_live_region = (await page.innerHTML('body')).includes('aria-live');

		if (js) {
			assert.ok(has_live_region);

			// live region should exist, but be empty
			assert.equal(await page.innerHTML('[aria-live]'), '');

			await Promise.all([page.waitForNavigation(), page.click('[href="/accessibility/b"]')]);
			await page.waitForTimeout(50);
			assert.equal(await page.innerHTML('[aria-live]'), 'Navigated to b'); // TODO i18n
		} else {
			assert.ok(!has_live_region);
		}
	});
}
