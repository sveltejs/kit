import { expect } from '@playwright/test';
import { test } from '../../../utils.js';

/** @typedef {import('@playwright/test').Response} Response */

test.skip(({ javaScriptEnabled }) => !javaScriptEnabled);

test.describe.configure({ mode: 'parallel' });

test.describe('embedded-widget', () => {
	test('serves embedded route in a third party page', async ({ page }) => {
		await page.goto('/third-party');

		const section = await page.locator('section#main');
		await expect(section).toContainText('This section is coming from the embed route.');
		await expect(section).toContainText('Data loaded from the server: { "counter": 10 }');
	});

	test('reactivity works', async ({ page }) => {
		await page.goto('/third-party');

		const section = await page.locator('section#main');

		await section.getByTestId('increment').click();
		await expect(section.getByTestId('counter')).toHaveText('11');
	});

	test('forms work', async ({ page }) => {
		await page.goto('/third-party');

		const section = await page.locator('section#main');

		await section.locator('[name="answer"]').fill('42');
		await section.getByTestId('submit').click();
		await expect(section.getByTestId('submitted')).toHaveText('The answer is 42');
	});

	test('links work', async ({ page }) => {
		await page.goto('/third-party');

		const section = await page.locator('section#main');

		await section.getByTestId('about-link').click();
		await expect(section).toContainText("It's the best widget of all time");
		// The url should not change in embed mode
		await expect(page).toHaveURL(/\/third-party$/);
		// add small delay
		await section.getByTestId('back').click();
		await expect(section).toContainText('About this widget');
	});
});
