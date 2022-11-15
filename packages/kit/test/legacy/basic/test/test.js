import { expect, test } from '@playwright/test';
import { testButtonTest } from '../../components/test-button-test.js';
import { routeLegacy } from '../../legacy-utils.js'

const detectModernBrowserVarName = '__KIT_is_modern_browser';

const dev = process.env.DEV === 'true';

if (!dev) {
	test('avoiding <script type="module"> but remaining with <script nomodule> should disable JS (sanity check)',
	async ({ page, javaScriptEnabled }) => {
		if (!javaScriptEnabled) {
			return;
		}
		// otherwise

		page.route('/test-page', async route => {
			const response = await page.request.fetch(route.request());
	
			let body = await response.text();
			body = body.replace(/<script type="module".*?<\/script>/g, '');
			
			route.fulfill({ response, body, headers: response.headers() });
		});
		
		await page.goto('/test-page');

		expect(await page.locator('#js-indicator').textContent()).toBe('false');
	});
}

// TODO: Add check for legacy by compatibility errors checks

const legacyStates = dev ? [false] : [false, true];

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

		expect(await page.locator('#js-indicator').textContent()).toBe(`${javaScriptEnabled}`);

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

		expect(await page.locator('#js-indicator').textContent()).toBe(`${javaScriptEnabled}`);
		expect(await page.locator('#legacy-indicator').textContent()).toBe(`${legacy}`);

		await testButtonTest({ button: page.locator('button'), javaScriptEnabled });
	});
}));