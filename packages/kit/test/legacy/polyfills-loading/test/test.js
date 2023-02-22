import { expect, test } from '@playwright/test';
import { routeLegacyCommon, detectModernBrowserVarName } from '../../legacy-utils.js';
import { dev, legacy_polyfill, modern_polyfill } from '../env.js';

const legacyStates = dev
	? [undefined]
	: [undefined, { simulatePartialESModule: false }, { simulatePartialESModule: true }];

/**
 *
 * @param {import('@playwright/test').Page} page
 * @param {typeof legacyStates[0]} legacyState
 */
async function verifyIndicators(page, legacyState) {
	// We wait instead of immediate expect, since on dev mode the page sometimes didn't finish to load JS, causing flakiness
	await page.locator(`#js-indicator:text("true")`).waitFor();

	expect(await page.locator('#legacy-indicator').textContent()).toBe(`${!!legacyState}`);
}

/**
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} varName
 * @param {boolean} shouldBeDefined
 */
async function checkGlobalIndicator(page, varName, shouldBeDefined) {
	const modernTokenValue = await page.evaluate(`window.${varName}`);
	expect(modernTokenValue).toBe(shouldBeDefined || undefined);
}

legacyStates.forEach((legacyState) =>
	test.describe(
		legacyState
			? legacyState.simulatePartialESModule
				? 'legacy (partial ESModule)'
				: 'legacy (no ESModule)'
			: 'modern',
		() => {
			test.skip(({ javaScriptEnabled }) => !(javaScriptEnabled ?? true));

			test('check global indicators variables', async ({ page }) => {
				await routeLegacyCommon(page, '/', legacyState);

				await page.goto('/');

				await verifyIndicators(page, legacyState);

				checkGlobalIndicator(page, detectModernBrowserVarName, !dev && legacyState === undefined);

				checkGlobalIndicator(page, 'legacy_polyfill_indicator', legacy_polyfill && !!legacyState);

				checkGlobalIndicator(page, 'modern_polyfill_indicator', modern_polyfill && !legacyState);
			});
		}
	)
);
