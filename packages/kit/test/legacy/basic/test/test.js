import { expect, test } from '@playwright/test';
import { testButtonTest } from '../../components/test-button-test.js';
import { routeLegacy } from '../../legacy-utils.js'

const legacyStates = (process.env.DEV === 'true') ? [false] : [false, true];

legacyStates.forEach((legacy) => test.describe(legacy ? 'legacy' : 'modern', () => {
	test.skip(({ javaScriptEnabled }) => !(javaScriptEnabled ?? true) && legacy);

	test('navigation', async ({ page, javaScriptEnabled }) => {
		javaScriptEnabled = javaScriptEnabled ?? true

		if (legacy) {
			routeLegacy(page, '/');
		}

		await page.goto('/');
		expect(await page.title()).toBe("SvelteKit Legacy Basic");

		await page.locator('a[href="/test-page"]').click();

		const rootStartingIndicatorText = await page.locator('#root-starting-indicator').textContent();

		if (javaScriptEnabled) {
			expect(rootStartingIndicatorText).toBe('true');
		} else {
			expect(rootStartingIndicatorText).toBe('false');
		}
	});

	test('test page', async ({ page, javaScriptEnabled }) => {
		javaScriptEnabled = javaScriptEnabled ?? true

		if (legacy) {
			routeLegacy(page, '/test-page');
		}

		await page.goto('/test-page');
		expect(await page.title()).toBe("SvelteKit Legacy Basic Test Page");

		expect(await page.locator('#legacy-indicator').textContent()).toBe(`${legacy}`);

		await testButtonTest({ button: page.locator('button'), javaScriptEnabled });
	});
}));