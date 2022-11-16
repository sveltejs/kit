import { expect, test } from '@playwright/test';
import { testButtonTest } from '../../components/test-button-test.js';
import { routeLegacy, routeLegacyCommon, detectModernBrowserVarName } from '../../legacy-utils.js';

const dev = process.env.DEV === 'true';

if (!dev) {
	test('avoiding <script type="module"> but remaining with <script nomodule> should disable JS (sanity check)', async ({
		page,
		javaScriptEnabled
	}) => {
		if (!javaScriptEnabled) {
			return;
		}
		// otherwise

		await routeLegacy(page, '/test-page', { stripNoModule: false });

		await page.goto('/test-page');

		expect(await page.locator('#js-indicator').textContent()).toBe('false');
	});
}

const legacyStates = dev
	? [undefined]
	: [undefined, { simulatePartialESModule: false }, { simulatePartialESModule: true }];

legacyStates.forEach((legacyState) =>
	test.describe(
		legacyState
			? legacyState.simulatePartialESModule
				? 'legacy (partial ESModule)'
				: 'legacy (no ESModule)'
			: 'modern',
		() => {
			test.skip(({ javaScriptEnabled }) => !(javaScriptEnabled ?? true) && !!legacyState);

			test('check modern browser token variable', async ({ page, javaScriptEnabled }) => {
				if (!javaScriptEnabled) {
					return;
				}
				// otherwise

				await routeLegacyCommon(page, '/', legacyState);

				await page.goto('/');

				const modernTokenValue = await page.evaluate(`window.${detectModernBrowserVarName}`);
				const shouldBeDefined = !dev && legacyState === undefined;
				expect(modernTokenValue).toBe(shouldBeDefined || undefined);
			});

			test('navigation', async ({ page, javaScriptEnabled }) => {
				javaScriptEnabled = javaScriptEnabled ?? true;

				await routeLegacyCommon(page, '/', legacyState);

				await page.goto('/');
				expect(await page.title()).toBe('SvelteKit Legacy Basic');

				await page.locator('a[href="/test-page"]').click();

				expect(await page.locator('#js-indicator').textContent()).toBe(`${javaScriptEnabled}`);

				const rootStartingIndicatorText = await page
					.locator('#root-starting-indicator')
					.textContent();

				expect(rootStartingIndicatorText).toBe(`${javaScriptEnabled}`);
			});

			test('test page', async ({ page, javaScriptEnabled }) => {
				javaScriptEnabled = javaScriptEnabled ?? true;

				await routeLegacyCommon(page, '/test-page', legacyState);

				await page.goto('/test-page');
				expect(await page.title()).toBe('SvelteKit Legacy Basic Test Page');

				// We wait instead of immediate expect, since on dev mode the page sometimes didn't finish to load JS, causing flakiness
				await page.locator(`#js-indicator:text("${javaScriptEnabled}")`).waitFor();

				expect(await page.locator('#legacy-indicator').textContent()).toBe(`${!!legacyState}`);

				await testButtonTest({ button: page.locator('button'), javaScriptEnabled });
			});
		}
	)
);
